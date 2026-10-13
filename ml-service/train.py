"""
FundTraceAI AML Model Training & Rigorous Evaluation Pipeline
Valid for AML Research: Temporal / Account-Disjoint splits, PR-AUC model selection,
Probability Calibration (Isotonic), Capacity-Constrained Threshold Tuning, and Time-Series CV.
"""

import os
import json
import pickle
import argparse
import time
from typing import Optional
from datetime import datetime
import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    roc_auc_score,
    roc_curve,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss,
)
import xgboost as xgb

from features import (
    FEATURE_COLS,
    BASE_FEATURE_COLS,
    GRAPH_FEATURE_COLS,
    CUSTOMER_FEATURE_COLS,
    compute_features_batch
)
from data_loader import load_dataset, SUPPORTED_DATASETS


# ── AML Operational & Capacity Constraints ────────────────────────────────────
# verify against current rules (e.g. FIU-IND / operational analyst staffing guidelines)
DEFAULT_MAX_ALERTS_PER_DAY = 50.0


# ── Custom AML Evaluation Metrics ─────────────────────────────────────────────

def compute_recall_at_fpr(y_true, y_prob, target_fpr: float) -> Optional[float]:
    """
    Computes recall (true positive rate) at a fixed false positive rate.
    Returns None if single-class test set or undefined ROC curve.
    """
    try:
        y_true_arr = np.array(y_true)
        if len(np.unique(y_true_arr)) < 2:
            return None
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        val = float(np.interp(target_fpr, fpr, tpr))
        return val if not (np.isnan(val) or np.isinf(val)) else None
    except Exception:
        return None


def compute_precision_at_k(y_true, y_prob, k: int) -> float:
    """
    Computes precision among the top-k highest predicted risk transactions.
    Standard AML metric representing alert triage precision under analyst capacity k.
    """
    try:
        y_true_arr = np.array(y_true)
        y_prob_arr = np.nan_to_num(np.array(y_prob), nan=0.0)
        order = np.argsort(y_prob_arr)[::-1]
        top_k_indices = order[:min(k, len(order))]
        if len(top_k_indices) == 0:
            return 0.0
        val = float(np.mean(y_true_arr[top_k_indices] == 1))
        return val if not (np.isnan(val) or np.isinf(val)) else 0.0
    except Exception:
        return 0.0


def compute_all_aml_metrics(y_true, y_prob, threshold: float = 0.5) -> dict:
    """
    Computes a comprehensive dictionary of AML research metrics for a given model.
    Guarantees JSON-safe finite values (no NaNs or infinities).
    Undefined metrics under single-class or zero-denominator conditions return None (JSON null).
    Genuine zero values remain 0.0. Confusion matrix is guaranteed 2x2.
    """
    y_true_arr = np.array(y_true)
    y_prob_arr = np.nan_to_num(np.array(y_prob), nan=0.0, posinf=1.0, neginf=0.0)
    y_pred = (y_prob_arr >= threshold).astype(int)

    classes_present = len(np.unique(y_true_arr))
    positives_count = int(np.sum(y_true_arr == 1))
    negatives_count = int(np.sum(y_true_arr == 0))

    # 1. Overall Accuracy (strictly defined for valid non-empty test sets)
    acc = None
    if len(y_true_arr) > 0:
        try:
            acc_val = float(accuracy_score(y_true_arr, y_pred))
            if not (np.isnan(acc_val) or np.isinf(acc_val)):
                acc = acc_val
            else:
                print("[Metric Info] Accuracy NaN/Inf under current evaluation split; returning None.")
        except Exception as e:
            print(f"[Metric Info] Accuracy calculation failed: {e}; returning None.")
            acc = None
    else:
        print("[Metric Info] Test set is empty; accuracy undefined (returning None).")
        acc = None

    # 2. PR-AUC (Precision-Recall Area Under Curve)
    # Requires positive class in test set
    pr_auc = None
    if classes_present > 1 and positives_count > 0:
        try:
            val = float(average_precision_score(y_true_arr, y_prob_arr))
            if not (np.isnan(val) or np.isinf(val)):
                pr_auc = val
        except Exception:
            pr_auc = None

    # 3. ROC-AUC (Requires both classes present)
    roc_auc = None
    if classes_present > 1:
        try:
            val = float(roc_auc_score(y_true_arr, y_prob_arr))
            if not (np.isnan(val) or np.isinf(val)):
                roc_auc = val
        except Exception:
            roc_auc = None

    # 4. Fixed-FPR Recall
    rec_1pct = compute_recall_at_fpr(y_true_arr, y_prob_arr, 0.01) if classes_present > 1 else None
    rec_5pct = compute_recall_at_fpr(y_true_arr, y_prob_arr, 0.05) if classes_present > 1 else None

    # 5. Precision@K
    p_at_100 = compute_precision_at_k(y_true_arr, y_prob_arr, 100)
    p_at_200 = compute_precision_at_k(y_true_arr, y_prob_arr, 200)
    p_at_500 = compute_precision_at_k(y_true_arr, y_prob_arr, 500)

    # 6. Brier Score Loss
    try:
        brier_val = float(brier_score_loss(y_true_arr, y_prob_arr))
        brier = brier_val if not (np.isnan(brier_val) or np.isinf(brier_val)) else 0.0
    except Exception:
        brier = 0.0

    # 7. Standard Binary Metrics: Precision, Recall, F1
    prec = float(precision_score(y_true_arr, y_pred, zero_division=0))

    if positives_count > 0:
        rec = float(recall_score(y_true_arr, y_pred, zero_division=0))
        f1 = float(f1_score(y_true_arr, y_pred, zero_division=0))
    else:
        # If there are no positive examples in ground truth, recall is undefined
        rec = None
        f1 = None

    # 8. Guaranteed 2x2 Confusion Matrix: [[TN, FP], [FN, TP]]
    cm = confusion_matrix(y_true_arr, y_pred, labels=[0, 1]).tolist()

    return {
        'accuracy':           acc,
        'pr_auc':             pr_auc,
        'roc_auc':            roc_auc,
        'recall_at_1pct_fpr': rec_1pct,
        'recall_at_5pct_fpr': rec_5pct,
        'precision_at_100':   p_at_100,
        'precision_at_200':   p_at_200,
        'precision_at_500':   p_at_500,
        'f1_score':           f1,
        'precision':          prec,
        'recall':             rec,
        'brier_score':        brier,
        'confusion_matrix':   cm,
    }


# ── Dataset Splitting (Temporal & Account-Disjoint) ────────────────────────────

def temporal_split(df: pd.DataFrame, train_ratio=0.70, val_ratio=0.15):
    """
    Temporal chronological split:
    Train on earliest 70%, validate on next 15%, test on last 15%.
    Guarantees no test row has a timestamp earlier than max train timestamp.
    """
    df_sorted = df.sort_values('timestamp').reset_index(drop=True)
    n = len(df_sorted)
    n_train = int(train_ratio * n)
    n_val = int(val_ratio * n)

    train_df = df_sorted.iloc[:n_train].copy()
    val_df = df_sorted.iloc[n_train:n_train + n_val].copy()
    test_df = df_sorted.iloc[n_train + n_val:].copy()

    return train_df, val_df, test_df


def account_disjoint_split(df: pd.DataFrame, train_ratio=0.70, val_ratio=0.15, seed=42):
    """
    Account-disjoint split:
    Partitions transactions such that sender accounts in train, val, and test are mutually disjoint.
    Stratifies accounts by whether they contain any laundering transactions.
    """
    sender_fraud = df.groupby('sender_account')['is_laundering'].max()
    fraud_senders = sender_fraud[sender_fraud == 1].index.tolist()
    clean_senders = sender_fraud[sender_fraud == 0].index.tolist()

    rng = np.random.RandomState(seed)
    rng.shuffle(fraud_senders)
    rng.shuffle(clean_senders)

    n_f, n_c = len(fraud_senders), len(clean_senders)
    f_tr_end = int(train_ratio * n_f)
    f_val_end = int((train_ratio + val_ratio) * n_f)
    c_tr_end = int(train_ratio * n_c)
    c_val_end = int((train_ratio + val_ratio) * n_c)

    train_senders = set(fraud_senders[:f_tr_end] + clean_senders[:c_tr_end])
    val_senders = set(fraud_senders[f_tr_end:f_val_end] + clean_senders[c_tr_end:c_val_end])
    test_senders = set(fraud_senders[f_val_end:] + clean_senders[c_val_end:])

    train_df = df[df['sender_account'].isin(train_senders)].sort_values('timestamp').reset_index(drop=True)
    val_df = df[df['sender_account'].isin(val_senders)].sort_values('timestamp').reset_index(drop=True)
    test_df = df[df['sender_account'].isin(test_senders)].sort_values('timestamp').reset_index(drop=True)

    return train_df, val_df, test_df


# ── Threshold Selection Under Analyst Capacity Constraint ──────────────────────

def select_optimal_threshold(y_val, y_val_prob, val_timestamps, max_alerts_per_day: float) -> tuple:
    """
    Chooses the classification threshold that maximizes validation recall subject to:
    alerts_per_day <= max_alerts_per_day.
    Tiebreaker: higher F1-score, then higher threshold to minimize redundant false positives.
    """
    t_min = pd.to_datetime(val_timestamps).min()
    t_max = pd.to_datetime(val_timestamps).max()
    val_days = max(1.0, (t_max - t_min).total_seconds() / 86400.0)
    max_val_alerts = max_alerts_per_day * val_days

    candidate_thresholds = np.linspace(0.01, 0.99, 197)
    best_thresh = 0.5
    best_recall = -1.0
    best_f1 = -1.0
    best_daily_alerts = 0.0

    y_val_arr = np.array(y_val)
    y_prob_arr = np.array(y_val_prob)

    for t in candidate_thresholds:
        preds = (y_prob_arr >= t).astype(int)
        n_alerts = preds.sum()
        if n_alerts <= max_val_alerts:
            rec = recall_score(y_val_arr, preds, zero_division=0)
            f1 = f1_score(y_val_arr, preds, zero_division=0)
            daily = n_alerts / val_days
            # Maximize recall; break ties with F1 score, then higher threshold to minimize redundant false alerts
            if (rec > best_recall) or \
               (abs(rec - best_recall) < 1e-4 and f1 > best_f1) or \
               (abs(rec - best_recall) < 1e-4 and abs(f1 - best_f1) < 1e-4 and t > best_thresh):
                best_recall = float(rec)
                best_f1 = float(f1)
                best_thresh = float(t)
                best_daily_alerts = float(daily)

    # Fallback if constraint was too strict to be met by any threshold
    if best_recall < 0:
        best_thresh = 0.5
        preds = (y_prob_arr >= best_thresh).astype(int)
        best_daily_alerts = float(preds.sum() / val_days)

    return best_thresh, best_daily_alerts


# ── 5-Fold Time-Series Cross Validation ───────────────────────────────────────

def run_time_series_cv(X_data: pd.DataFrame, y_data: pd.Series, model_builder, is_scaled: bool, scaler=None, n_splits=5) -> dict:
    """
    Performs 5-fold TimeSeriesSplit cross validation on chronological data.
    Returns mean and std for all core AML metrics.
    """
    tscv = TimeSeriesSplit(n_splits=n_splits)
    fold_metrics = []

    for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_data)):
        X_tr = X_data.iloc[tr_idx]
        y_tr = y_data.iloc[tr_idx]
        X_v = X_data.iloc[val_idx]
        y_v = y_data.iloc[val_idx]

        clf = model_builder()
        if is_scaled and scaler is not None:
            s = StandardScaler()
            X_tr_in = s.fit_transform(X_tr)
            X_v_in = s.transform(X_v)
        else:
            X_tr_in = X_tr
            X_v_in = X_v

        clf.fit(X_tr_in, y_tr)
        probs = clf.predict_proba(X_v_in)[:, 1]

        m = compute_all_aml_metrics(y_v, probs, threshold=0.5)
        fold_metrics.append(m)

    summary = {}
    keys = ['accuracy', 'pr_auc', 'roc_auc', 'recall_at_1pct_fpr', 'recall_at_5pct_fpr', 'precision_at_100', 'f1_score', 'brier_score']
    for k in keys:
        vals = [f[k] for f in fold_metrics if f.get(k) is not None]
        summary[k] = {
            'mean': float(np.mean(vals)) if len(vals) > 0 else None,
            'std':  float(np.std(vals)) if len(vals) > 0 else None
        }

    return {'n_splits': n_splits, 'metrics': summary}


# ── Graph Feature Ablation Study ──────────────────────────────────────────────

def _safe_diff(val_a, val_b, decimals=4):
    """Safely computes rounded difference between two metric values, handling None."""
    if val_a is None or val_b is None:
        return 0.0
    return round(float(val_a) - float(val_b), decimals)


def run_graph_ablation_study(
    candidates: dict,
    X_train_df: pd.DataFrame,
    y_train: pd.Series,
    X_val_df: pd.DataFrame,
    y_val: pd.Series,
    X_test_df: pd.DataFrame,
    y_test: pd.Series,
    threshold: float = 0.5
) -> dict:
    """
    Compares candidate model performance strictly with and without graph features.
    Computes PR-AUC, ROC-AUC, Recall@1%FPR, Recall@5%FPR, Precision@100, F1-Score, and Brier score.
    Returns ablation report dictionary.
    """
    ablation_results = {}
    base_graph_cols = BASE_FEATURE_COLS + GRAPH_FEATURE_COLS

    for name, cfg in candidates.items():
        is_scaled = cfg['scaled']

        # 1. Base Features Only (12 features)
        clf_base = cfg['builder']()
        if is_scaled:
            s_base = StandardScaler()
            X_tr_base = s_base.fit_transform(X_train_df[BASE_FEATURE_COLS])
            X_v_base = s_base.transform(X_val_df[BASE_FEATURE_COLS])
            X_te_base = s_base.transform(X_test_df[BASE_FEATURE_COLS])
        else:
            X_tr_base = X_train_df[BASE_FEATURE_COLS]
            X_v_base = X_val_df[BASE_FEATURE_COLS]
            X_te_base = X_test_df[BASE_FEATURE_COLS]

        clf_base.fit(X_tr_base, y_train)
        val_probs_base = clf_base.predict_proba(X_v_base)[:, 1]
        test_probs_base = clf_base.predict_proba(X_te_base)[:, 1]

        m_base = compute_all_aml_metrics(y_test, test_probs_base, threshold=threshold)
        m_base['val_pr_auc'] = m_base['pr_auc']

        # 2. Base + Graph Features (21 features)
        clf_graph = cfg['builder']()
        if is_scaled:
            s_graph = StandardScaler()
            X_tr_graph = s_graph.fit_transform(X_train_df[base_graph_cols])
            X_v_graph = s_graph.transform(X_val_df[base_graph_cols])
            X_te_graph = s_graph.transform(X_test_df[base_graph_cols])
        else:
            X_tr_graph = X_train_df[base_graph_cols]
            X_v_graph = X_val_df[base_graph_cols]
            X_te_graph = X_test_df[base_graph_cols]

        clf_graph.fit(X_tr_graph, y_train)
        val_probs_graph = clf_graph.predict_proba(X_v_graph)[:, 1]
        test_probs_graph = clf_graph.predict_proba(X_te_graph)[:, 1]

        m_graph = compute_all_aml_metrics(y_test, test_probs_graph, threshold=threshold)
        m_graph['val_pr_auc'] = m_graph['pr_auc']

        # 3. Full Feature Set (Base + Graph + Customer: 28 features)
        clf_full = cfg['builder']()
        if is_scaled:
            s_full = StandardScaler()
            X_tr_full = s_full.fit_transform(X_train_df[FEATURE_COLS])
            X_v_full = s_full.transform(X_val_df[FEATURE_COLS])
            X_te_full = s_full.transform(X_test_df[FEATURE_COLS])
        else:
            X_tr_full = X_train_df[FEATURE_COLS]
            X_v_full = X_val_df[FEATURE_COLS]
            X_te_full = X_test_df[FEATURE_COLS]

        clf_full.fit(X_tr_full, y_train)
        val_probs_full = clf_full.predict_proba(X_v_full)[:, 1]
        test_probs_full = clf_full.predict_proba(X_te_full)[:, 1]

        m_full = compute_all_aml_metrics(y_test, test_probs_full, threshold=threshold)
        m_full['val_pr_auc'] = m_full['pr_auc']

        delta_graph = {
            'pr_auc': _safe_diff(m_graph.get('pr_auc'), m_base.get('pr_auc')),
            'roc_auc': _safe_diff(m_graph.get('roc_auc'), m_base.get('roc_auc')),
            'recall_at_1pct_fpr': _safe_diff(m_graph.get('recall_at_1pct_fpr'), m_base.get('recall_at_1pct_fpr')),
            'f1_score': _safe_diff(m_graph.get('f1_score'), m_base.get('f1_score')),
        }

        delta_customer = {
            'pr_auc': _safe_diff(m_full.get('pr_auc'), m_graph.get('pr_auc')),
            'roc_auc': _safe_diff(m_full.get('roc_auc'), m_graph.get('roc_auc')),
            'recall_at_1pct_fpr': _safe_diff(m_full.get('recall_at_1pct_fpr'), m_graph.get('recall_at_1pct_fpr')),
            'f1_score': _safe_diff(m_full.get('f1_score'), m_graph.get('f1_score')),
        }

        delta_total = {
            'pr_auc': _safe_diff(m_full.get('pr_auc'), m_base.get('pr_auc')),
            'roc_auc': _safe_diff(m_full.get('roc_auc'), m_base.get('roc_auc')),
            'val_pr_auc': _safe_diff(m_full.get('val_pr_auc'), m_base.get('val_pr_auc')),
            'recall_at_1pct_fpr': _safe_diff(m_full.get('recall_at_1pct_fpr'), m_base.get('recall_at_1pct_fpr')),
            'recall_at_5pct_fpr': _safe_diff(m_full.get('recall_at_5pct_fpr'), m_base.get('recall_at_5pct_fpr')),
            'precision_at_100': _safe_diff(m_full.get('precision_at_100'), m_base.get('precision_at_100')),
            'f1_score': _safe_diff(m_full.get('f1_score'), m_base.get('f1_score')),
            'brier_score': _safe_diff(m_full.get('brier_score'), m_base.get('brier_score'))
        }

        ablation_results[name] = {
            'without_graph_features': m_base,
            'with_graph_only': m_graph,
            'with_customer_features': m_full,
            'with_graph_features': m_full,
            'delta_graph': delta_graph,
            'delta_customer': delta_customer,
            'delta': delta_total
        }

    return ablation_results


# ── Main Training & Rigorous Evaluation Entry Point ───────────────────────────

def train_and_evaluate(
    split_mode: str = 'temporal',
    max_alerts_per_day: float = DEFAULT_MAX_ALERTS_PER_DAY,
    dataset_path: str = None,
    dataset_name: str = None,
    max_rows: int = None,
    analyst_labels: list = None,
    analyst_labels_path: str = None,
    analyst_label_weight: float = 3.0
):
    """
    Trains candidate AML classifiers, selects the best using validation PR-AUC,
    calibrates probabilities with isotonic regression, tunes threshold under analyst capacity,
    evaluates on the test partition once at the end, and saves models and metrics.
    Integrates analyst feedback labels with configurable sample weights and enforces strict temporal holdout integrity.
    """
    selected_name = dataset_name or os.environ.get('DATASET_NAME', 'synthetic')
    print(f"Loading dataset via unified loader (name='{selected_name}', path={dataset_path})...")
    df_raw = load_dataset(name=selected_name, dataset_path=dataset_path, max_rows=max_rows)

    print(f"Loaded {len(df_raw):,} rows. Running vectorized feature engineering...")
    df = compute_features_batch(df_raw)

    feature_cols = FEATURE_COLS
    fraud_rate = float(df['is_laundering'].mean())
    print(f"Dataset class balance — fraud rate: {fraud_rate:.3%}")

    # ── 1. Split Strategy (Temporal or Account-Disjoint) ───────────────────────
    split_mode_normalized = split_mode.lower().strip()
    if split_mode_normalized == 'account-disjoint':
        print("[Split Strategy] Using ACCOUNT-DISJOINT split mode (70% train / 15% val / 15% test).")
        train_df, val_df, test_df = account_disjoint_split(df, train_ratio=0.70, val_ratio=0.15)
    else:
        split_mode_normalized = 'temporal'
        print("[Split Strategy] Using TEMPORAL chronological split mode (70% train / 15% val / 15% test).")
        train_df, val_df, test_df = temporal_split(df, train_ratio=0.70, val_ratio=0.15)

    print(f"  Train partition: {len(train_df):,} rows ({train_df['timestamp'].min()} to {train_df['timestamp'].max()})")
    print(f"  Val partition:   {len(val_df):,} rows ({val_df['timestamp'].min()} to {val_df['timestamp'].max()})")
    print(f"  Test partition:  {len(test_df):,} rows ({test_df['timestamp'].min()} to {test_df['timestamp'].max()})")

    # ── Analyst Feedback Integration & Temporal Split Preservation ───────────
    analyst_labels_list = []
    if analyst_labels:
        analyst_labels_list = analyst_labels
    elif analyst_labels_path and os.path.exists(analyst_labels_path):
        try:
            with open(analyst_labels_path, 'r') as f:
                analyst_labels_list = json.load(f)
        except Exception as e:
            print(f"[Feedback Warning] Failed to load analyst labels from {analyst_labels_path}: {e}")

    train_df = train_df.copy()
    train_weights = pd.Series(1.0, index=train_df.index)
    ingested_labels_count = 0
    discarded_test_period_labels = 0

    if analyst_labels_list and 'transaction_id' in train_df.columns:
        tx_to_idx = {tx_id: idx for idx, tx_id in zip(train_df.index, train_df['transaction_id'])}
        test_tx_set = set(test_df['transaction_id']) if 'transaction_id' in test_df.columns else set()

        for item in analyst_labels_list:
            tx_id = item.get('transaction_id')
            label_val = item.get('label')
            weight_val = float(item.get('weight') or analyst_label_weight or 3.0)

            if label_val is None or (label_val != 0 and label_val != 1):
                continue

            if tx_id in tx_to_idx:
                idx = tx_to_idx[tx_id]
                train_df.loc[idx, 'is_laundering'] = int(label_val)
                train_weights.loc[idx] = max(1.0, weight_val)
                ingested_labels_count += 1
            elif tx_id in test_tx_set:
                discarded_test_period_labels += 1

        print(f"[Feedback Integration] Ingested {ingested_labels_count} analyst labels into training set (sample_weight={analyst_label_weight}).")
        if discarded_test_period_labels > 0:
            print(f"[Temporal Integrity] Strictly excluded {discarded_test_period_labels} analyst labels occurring in test holdout partition.")

    X_train, y_train = train_df[feature_cols], train_df['is_laundering']
    X_val, y_val = val_df[feature_cols], val_df['is_laundering']
    X_test, y_test = test_df[feature_cols], test_df['is_laundering']

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled   = scaler.transform(X_val)
    X_test_scaled  = scaler.transform(X_test)

    scale_pos_weight = max(1.0, (1.0 - fraud_rate) / fraud_rate)

    candidates = {
        'Logistic Regression': {
            'builder': lambda: LogisticRegression(
                max_iter=1000, random_state=42, class_weight='balanced'
            ),
            'scaled': True
        },
        'Decision Tree': {
            'builder': lambda: DecisionTreeClassifier(
                max_depth=7, random_state=42, class_weight='balanced'
            ),
            'scaled': False
        },
        'Random Forest': {
            'builder': lambda: RandomForestClassifier(
                n_estimators=150, max_depth=10, random_state=42,
                class_weight='balanced', n_jobs=-1
            ),
            'scaled': False
        },
        'Gradient Boosting': {
            'builder': lambda: GradientBoostingClassifier(
                n_estimators=150, max_depth=5, learning_rate=0.08,
                subsample=0.8, random_state=42
            ),
            'scaled': False
        },
        'XGBoost': {
            'builder': lambda: xgb.XGBClassifier(
                n_estimators=150, max_depth=6, learning_rate=0.08,
                subsample=0.8, colsample_bytree=0.8,
                scale_pos_weight=scale_pos_weight,
                random_state=42, eval_metric='logloss'
            ),
            'scaled': False
        },
    }

    # ── 2. Train on Train Set, Select Best Model on Validation PR-AUC ─────────
    validation_results = {}
    fitted_models = {}
    fitted_train_times = {}
    best_val_score = -1.0
    best_model_name = list(candidates.keys())[0]

    print("\n" + "=" * 70)
    print("Candidate Model Training & Validation Evaluation (Selection Metric: PR-AUC)")
    print("=" * 70)

    sample_weights_arr = train_weights.values

    for name, cfg in candidates.items():
        clf = cfg['builder']()
        is_scaled = cfg['scaled']

        X_tr_in = X_train_scaled if is_scaled else X_train
        X_val_in = X_val_scaled if is_scaled else X_val

        t_fit_start = time.perf_counter()
        try:
            clf.fit(X_tr_in, y_train, sample_weight=sample_weights_arr)
        except TypeError:
            clf.fit(X_tr_in, y_train)
        fit_time_ms = round((time.perf_counter() - t_fit_start) * 1000.0, 2)

        fitted_models[name] = clf
        fitted_train_times[name] = fit_time_ms

        t_val_start = time.perf_counter()
        val_probs = clf.predict_proba(X_val_in)[:, 1]
        val_infer_ms = round((time.perf_counter() - t_val_start) * 1000.0, 2)

        val_metrics = compute_all_aml_metrics(y_val, val_probs, threshold=0.5)
        val_metrics['val_pr_auc'] = val_metrics['pr_auc']
        val_metrics['training_time_ms'] = fit_time_ms
        val_metrics['inference_time_ms'] = val_infer_ms
        validation_results[name] = val_metrics

        pr_disp = f"{val_metrics['pr_auc']:.4f}" if val_metrics['pr_auc'] is not None else "N/A"
        roc_disp = f"{val_metrics['roc_auc']:.4f}" if val_metrics['roc_auc'] is not None else "N/A"
        rec_disp = f"{val_metrics['recall_at_1pct_fpr']:.4f}" if val_metrics['recall_at_1pct_fpr'] is not None else "N/A"
        p100_disp = f"{val_metrics['precision_at_100']:.4f}" if val_metrics['precision_at_100'] is not None else "N/A"

        print(f"[{name}] Fit: {fit_time_ms}ms | Val PR-AUC={pr_disp} | "
              f"ROC-AUC={roc_disp} | "
              f"Recall@1%FPR={rec_disp} | "
              f"Precision@100={p100_disp}")

        # Champion Selection Policy:
        # Prioritize PR-AUC (key AML imbalanced metric). If undefined, fallback to F1 then Accuracy.
        score = val_metrics['pr_auc'] if val_metrics['pr_auc'] is not None else (
            val_metrics['f1_score'] if val_metrics['f1_score'] is not None else val_metrics['accuracy']
        )
        if score is not None and score > best_val_score:
            best_val_score = score
            best_model_name = name

    print(f"\n[SELECTED CHAMPION] {best_model_name} (Selection Score = {best_val_score:.4f})")
    champion_clf = fitted_models[best_model_name]
    champion_is_scaled = candidates[best_model_name]['scaled']

    # ── 3. Probability Calibration on Validation Set ──────────────────────────
    print("\n[Calibration] Fitting CalibratedClassifierCV (Isotonic) on Validation Set...")
    try:
        from sklearn.frozen import FrozenEstimator
        calibrated_champion = CalibratedClassifierCV(FrozenEstimator(champion_clf), method='isotonic')
    except ImportError:
        calibrated_champion = CalibratedClassifierCV(estimator=champion_clf, method='isotonic', cv='prefit')

    X_val_champion = X_val_scaled if champion_is_scaled else X_val
    try:
        calibrated_champion.fit(X_val_champion, y_val)
        val_cal_probs = calibrated_champion.predict_proba(X_val_champion)[:, 1]
    except Exception as cal_err:
        print(f"  [Calibration Notice] Using uncalibrated champion probabilities: {cal_err}")
        calibrated_champion = champion_clf
        val_cal_probs = champion_clf.predict_proba(X_val_champion)[:, 1]

    # ── 4. Threshold Selection Under Analyst Capacity Constraint ──────────────
    print(f"[Threshold Tuning] Optimizing for max recall with capacity <= {max_alerts_per_day:.1f} alerts/day...")
    optimal_threshold, val_daily_alerts = select_optimal_threshold(
        y_val, val_cal_probs, val_df['timestamp'], max_alerts_per_day
    )
    print(f"  Selected Optimal Threshold: {optimal_threshold:.3f} (Val alert rate: {val_daily_alerts:.1f} alerts/day)")

    # ── 5. Final Evaluation on TEST SET (Evaluated Once at End) ───────────────
    print("\n" + "=" * 70)
    print("Final Model Evaluation on Test Set (Zero Data Leakage)")
    print("=" * 70)

    test_days = max(1.0, (test_df['timestamp'].max() - test_df['timestamp'].min()).total_seconds() / 86400.0)

    comparison_results = {}
    for name, clf in fitted_models.items():
        is_scaled = candidates[name]['scaled']
        X_test_in = X_test_scaled if is_scaled else X_test

        t_test_start = time.perf_counter()
        if name == best_model_name and calibrated_champion is not None:
            # Champion uses calibrated probabilities
            raw_test_probs = clf.predict_proba(X_test_in)[:, 1]
            test_probs = calibrated_champion.predict_proba(X_test_in)[:, 1]
            brier_raw = float(brier_score_loss(y_test, raw_test_probs))
        else:
            test_probs = clf.predict_proba(X_test_in)[:, 1]
            brier_raw = float(brier_score_loss(y_test, test_probs))
        test_infer_ms = round((time.perf_counter() - t_test_start) * 1000.0, 2)

        # Model evaluation threshold:
        # Champion uses optimal_threshold (tuned on validation calibrated probabilities).
        # Candidate models use their validation-tuned operating threshold.
        if name == best_model_name:
            eval_thresh = optimal_threshold
        else:
            X_val_in = X_val_scaled if is_scaled else X_val
            m_val_probs = clf.predict_proba(X_val_in)[:, 1]
            eval_thresh, _ = select_optimal_threshold(
                y_val, m_val_probs, val_df['timestamp'], max_alerts_per_day
            )

        test_m = compute_all_aml_metrics(y_test, test_probs, threshold=eval_thresh)
        test_m['threshold_used'] = float(eval_thresh)
        test_m['val_pr_auc'] = validation_results[name]['pr_auc']
        test_m['training_time_ms'] = fitted_train_times.get(name, 0.0)
        test_m['inference_time_ms'] = test_infer_ms
        comparison_results[name] = test_m

        pr_disp = f"{test_m['pr_auc']:.4f}" if test_m['pr_auc'] is not None else "N/A"
        roc_disp = f"{test_m['roc_auc']:.4f}" if test_m['roc_auc'] is not None else "N/A"
        acc_disp = f"{test_m['accuracy']:.4f}" if test_m['accuracy'] is not None else "N/A"
        rec_disp = f"{test_m['recall_at_1pct_fpr']:.4f}" if test_m['recall_at_1pct_fpr'] is not None else "N/A"
        f1_disp = f"{test_m['f1_score']:.4f}" if test_m['f1_score'] is not None else "N/A"
        brier_disp = f"{test_m['brier_score']:.4f}" if test_m['brier_score'] is not None else "N/A"

        print(f"[{name}] (thresh={eval_thresh:.3f}) Acc={acc_disp} | "
              f"Test PR-AUC={pr_disp} | "
              f"ROC-AUC={roc_disp} | "
              f"Recall@1%FPR={rec_disp} | "
              f"F1(@{eval_thresh:.2f})={f1_disp} | "
              f"Brier={brier_disp} | "
              f"Infer: {test_infer_ms}ms")

    champion_test_metrics = comparison_results[best_model_name]
    X_test_champ = X_test_scaled if champion_is_scaled else X_test
    champ_pred_probs = calibrated_champion.predict_proba(X_test_champ)[:, 1]
    test_alerts_count = int((champ_pred_probs >= optimal_threshold).sum())
    test_daily_alerts = float(test_alerts_count / test_days)
    champion_test_metrics['daily_alerts'] = test_daily_alerts

    # ── 6. Reliability Diagram (Calibration Curve) Data ───────────────────────
    raw_test_probs_champ = champion_clf.predict_proba(X_test_champ)[:, 1]
    cal_test_probs_champ = calibrated_champion.predict_proba(X_test_champ)[:, 1]

    try:
        prob_true_uncal, prob_pred_uncal = calibration_curve(y_test, raw_test_probs_champ, n_bins=10, strategy='uniform')
        prob_true_cal, prob_pred_cal = calibration_curve(y_test, cal_test_probs_champ, n_bins=10, strategy='uniform')
    except Exception:
        prob_true_uncal, prob_pred_uncal = np.array([0.0, 1.0]), np.array([0.0, 1.0])
        prob_true_cal, prob_pred_cal = np.array([0.0, 1.0]), np.array([0.0, 1.0])

    reliability_data = {
        'brier_score_raw': float(brier_score_loss(y_test, raw_test_probs_champ)),
        'brier_score_calibrated': float(brier_score_loss(y_test, cal_test_probs_champ)),
        'n_bins': 10,
        'uncalibrated': {
            'prob_pred': [float(x) for x in prob_pred_uncal],
            'prob_true': [float(x) for x in prob_true_uncal]
        },
        'calibrated': {
            'prob_pred': [float(x) for x in prob_pred_cal],
            'prob_true': [float(x) for x in prob_true_cal]
        }
    }

    # ── 7. 5-Fold Time-Series Cross-Validation ────────────────────────────────
    print("\n[Cross-Validation] Running 5-fold TimeSeriesCV on Train+Val partition...")
    train_val_df = pd.concat([train_df, val_df]).sort_values('timestamp').reset_index(drop=True)
    X_tv = train_val_df[feature_cols]
    y_tv = train_val_df['is_laundering']

    cv_summary = run_time_series_cv(
        X_tv, y_tv,
        model_builder=candidates[best_model_name]['builder'],
        is_scaled=champion_is_scaled,
        scaler=scaler,
        n_splits=5
    )
    for metric_k, stats in cv_summary['metrics'].items():
        print(f"  CV {metric_k}: {stats['mean']:.4f} ± {stats['std']:.4f}")

    # ── 8. Graph Feature Ablation Study ───────────────────────────────────────
    print("\n" + "=" * 70)
    print("Graph Feature Ablation Study: Performance With vs Without Graph Features")
    print("=" * 70)

    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)

    ablation_results = run_graph_ablation_study(
        candidates,
        train_df, y_train,
        val_df, y_val,
        test_df, y_test,
        threshold=optimal_threshold
    )

    for m_name, a_data in ablation_results.items():
        base_pr = a_data['without_graph_features']['pr_auc']
        graph_pr = a_data.get('with_graph_only', {}).get('pr_auc', base_pr)
        full_pr = a_data['with_customer_features']['pr_auc']
        d_graph = a_data.get('delta_graph', {}).get('pr_auc', 0.0)
        d_cust = a_data.get('delta_customer', {}).get('pr_auc', 0.0)
        d_tot = a_data['delta']['pr_auc']
        print(f"  [{m_name}] PR-AUC: Base({base_pr:.4f}) -> +Graph({graph_pr:.4f}, diff={d_graph:+.4f}) -> +Customer({full_pr:.4f}, diff={d_cust:+.4f}) | Total Delta={d_tot:+.4f}")

    ablation_payload = {
        'timestamp': datetime.now().isoformat(),
        'dataset_name': selected_name,
        'base_features_count': len(BASE_FEATURE_COLS),
        'graph_features_count': len(GRAPH_FEATURE_COLS),
        'customer_features_count': len(CUSTOMER_FEATURE_COLS),
        'total_features_count': len(FEATURE_COLS),
        'base_feature_cols': BASE_FEATURE_COLS,
        'graph_feature_cols': GRAPH_FEATURE_COLS,
        'customer_feature_cols': CUSTOMER_FEATURE_COLS,
        'models': ablation_results,
        'champion_model': best_model_name,
        'champion_ablation': ablation_results.get(best_model_name)
    }

    with open(os.path.join(models_dir, 'ablation.json'), 'w') as f:
        json.dump(ablation_payload, f, indent=4)
    print(f"\n[OK] Ablation study successfully saved to {os.path.join(models_dir, 'ablation.json')}")

    metrics_output = {
        'comparison':             comparison_results,
        'best_model':             best_model_name,
        'features':               feature_cols,
        'fraud_rate':             fraud_rate,
        'trained_at':             datetime.now().isoformat(),
        'dataset_name':           selected_name,
        'split_mode':             split_mode_normalized,
        'benchmark_diagnostics': {
            'dataset_name':           selected_name,
            'total_records':          len(df),
            'total_suspicious':       int(df['is_laundering'].sum()),
            'total_legitimate':       int((df['is_laundering'] == 0).sum()),
            'overall_fraud_rate':     float(df['is_laundering'].mean()),
            'split_mode':             split_mode_normalized,
            'train_records':          len(train_df),
            'train_positives':        int(train_df['is_laundering'].sum()),
            'train_negatives':        int((train_df['is_laundering'] == 0).sum()),
            'train_fraud_rate':       float(train_df['is_laundering'].mean()),
            'val_records':            len(val_df),
            'val_positives':          int(val_df['is_laundering'].sum()),
            'val_negatives':          int((val_df['is_laundering'] == 0).sum()),
            'val_fraud_rate':         float(val_df['is_laundering'].mean()),
            'test_records':           len(test_df),
            'test_positives':         int(test_df['is_laundering'].sum()),
            'test_negatives':         int((test_df['is_laundering'] == 0).sum()),
            'test_fraud_rate':        float(test_df['is_laundering'].mean()),
            'optimal_threshold':      optimal_threshold,
            'analyst_capacity_daily': max_alerts_per_day,
            'test_daily_alerts':      test_daily_alerts,
            'champion_model':         best_model_name,
            'feature_count':          len(feature_cols),
            'version_id':             None
        },
        'split_details': {
            'mode':               split_mode_normalized,
            'train_rows':         len(train_df),
            'train_positives':    int(train_df['is_laundering'].sum()),
            'val_rows':           len(val_df),
            'val_positives':      int(val_df['is_laundering'].sum()),
            'test_rows':          len(test_df),
            'test_positives':     int(test_df['is_laundering'].sum()),
            'train_date_range':   [str(train_df['timestamp'].min()), str(train_df['timestamp'].max())],
            'val_date_range':     [str(val_df['timestamp'].min()), str(val_df['timestamp'].max())],
            'test_date_range':    [str(test_df['timestamp'].min()), str(test_df['timestamp'].max())],
        },
        'feedback_retraining': {
            'analyst_labels_ingested': ingested_labels_count,
            'analyst_label_weight': analyst_label_weight,
            'test_period_labels_excluded': discarded_test_period_labels,
            'temporal_split_strictly_preserved': True
        },
        'optimal_threshold':      optimal_threshold,
        'analyst_capacity_daily': max_alerts_per_day,
        'brier_score':            champion_test_metrics['brier_score'],
        'brier_score_raw':        reliability_data['brier_score_raw'],
        'calibration_curve':      reliability_data,
        'test_metrics':           champion_test_metrics,
        'time_series_cv':         cv_summary,
        'ablation':               ablation_payload
    }

    # ── 9. Save to Versioned Model Registry (models/versions/<version_id>/) ────
    from model_registry import save_model_version
    version_meta = save_model_version(
        model_obj=calibrated_champion,
        scaler_obj=scaler,
        metrics_dict=metrics_output,
        feature_cols=feature_cols,
        reliability_data=reliability_data,
        ablation_data=ablation_payload,
        train_df=train_df,
        is_promoted=False
    )
    metrics_output['version_id'] = version_meta['version_id']
    metrics_output['training_data_hash'] = version_meta['training_data_hash']
    metrics_output['config_hash'] = version_meta['config_hash']
    metrics_output['benchmark_diagnostics']['version_id'] = version_meta['version_id']

    # Synchronize metrics.json with root models/ and backend local cache
    try:
        root_metrics_path = os.path.join(os.path.dirname(__file__), 'models', 'metrics.json')
        with open(root_metrics_path, 'w') as f_root:
            json.dump(metrics_output, f_root, indent=4)
        print(f"[OK] Synchronized metrics cache with {root_metrics_path}")
    except Exception as root_err:
        print(f"[Notice] Root models metrics sync skipped: {root_err}")

    try:
        backend_cfg_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'src', 'config')
        if os.path.exists(backend_cfg_dir):
            backend_metrics_path = os.path.join(backend_cfg_dir, 'metrics.json')
            with open(backend_metrics_path, 'w') as f_b:
                json.dump(metrics_output, f_b, indent=4)
            print(f"[OK] Synchronized metrics cache with {backend_metrics_path}")
    except Exception as sync_err:
        print(f"[Notice] Backend metrics sync skipped: {sync_err}")

    print(f"\n[OK] Model version '{version_meta['version_id']}' recorded in registry.json and saved to models/versions/{version_meta['version_id']}/")
    return metrics_output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="FundTraceAI AML Model Training & Rigorous Evaluation")
    parser.add_argument(
        '--dataset-name', '--dataset', dest='dataset_name', choices=SUPPORTED_DATASETS, default=None,
        help="Dataset benchmark to train on: 'synthetic' (default), 'ibm_aml', or 'saml_d' (overrides DATASET_NAME env var)"
    )
    parser.add_argument(
        '--split-mode', choices=['temporal', 'account-disjoint'], default='temporal',
        help="Data split mode: 'temporal' (70/15/15 time split) or 'account-disjoint' (disjoint sender accounts)"
    )
    parser.add_argument(
        '--max-alerts-per-day', type=float, default=DEFAULT_MAX_ALERTS_PER_DAY,
        help="Operational analyst capacity constraint (maximum alerts per day)"
    )
    parser.add_argument(
        '--dataset-path', type=str, default=None,
        help="Custom path to transaction CSV dataset"
    )
    parser.add_argument(
        '--max-rows', type=int, default=None,
        help="Maximum rows to load from dataset (useful for faster benchmarking on massive datasets)"
    )
    parser.add_argument(
        '--analyst-labels-path', type=str, default=None,
        help="Path to JSON file with analyst-confirmed labels for weighted active-learning feedback retraining"
    )
    parser.add_argument(
        '--analyst-label-weight', type=float, default=3.0,
        help="Sample weight assigned to analyst-confirmed feedback labels (default: 3.0)"
    )
    args = parser.parse_args()

    train_and_evaluate(
        split_mode=args.split_mode,
        max_alerts_per_day=args.max_alerts_per_day,
        dataset_path=args.dataset_path,
        dataset_name=args.dataset_name,
        max_rows=args.max_rows,
        analyst_labels_path=args.analyst_labels_path,
        analyst_label_weight=args.analyst_label_weight
    )
