"""
Regression tests for FundTraceAI AML Model Benchmark & Evaluation Pipeline:
- Accuracy N/A resolution
- Target / post-investigation feature leakage prevention
- Single-class and edge-case evaluation safety
- Split partitioning integrity (temporal chronological & account-disjoint)
- Continuous probability scoring for ROC-AUC / PR-AUC
- Mathematical metric consistency (F1, Precision, Recall, Confusion Matrix)
"""

import pytest
import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from features import FEATURE_COLS, BASE_FEATURE_COLS, GRAPH_FEATURE_COLS, CUSTOMER_FEATURE_COLS
from train import (
    compute_all_aml_metrics,
    temporal_split,
    account_disjoint_split,
    select_optimal_threshold
)


# ── 1. Accuracy Calculation & Non-N/A Guarantee ────────────────────────────────

def test_accuracy_calculated_correctly_for_valid_predictions():
    """Accuracy must be correctly calculated and returned as a float for valid non-empty test sets."""
    y_true = np.array([0, 0, 1, 1, 0, 1, 0, 0])
    y_prob = np.array([0.1, 0.2, 0.8, 0.9, 0.3, 0.7, 0.4, 0.1])
    
    metrics = compute_all_aml_metrics(y_true, y_prob, threshold=0.5)
    
    assert 'accuracy' in metrics
    assert metrics['accuracy'] is not None
    assert isinstance(metrics['accuracy'], float)
    assert metrics['accuracy'] == 1.0  # All 8 correctly classified


def test_accuracy_matches_confusion_matrix_and_predictions():
    """Accuracy must strictly equal (TP + TN) / Total."""
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1, 0, 1])
    # Predictions: 7 correct, 3 wrong
    y_prob = np.array([0.1, 0.2, 0.8, 0.1, 0.9, 0.8, 0.2, 0.7, 0.9, 0.6])  # indices 2 (FP), 6 (FN), 8 (FP)
    
    metrics = compute_all_aml_metrics(y_true, y_prob, threshold=0.5)
    cm = metrics['confusion_matrix']
    tn, fp = cm[0][0], cm[0][1]
    fn, tp = cm[1][0], cm[1][1]
    
    expected_acc = (tp + tn) / (tp + tn + fp + fn)
    assert round(metrics['accuracy'], 4) == round(expected_acc, 4)
    assert round(metrics['accuracy'], 4) == 0.7000


def test_accuracy_undefined_for_empty_test_set():
    """Empty test set should return accuracy None without raising exceptions."""
    metrics = compute_all_aml_metrics([], [], threshold=0.5)
    assert metrics['accuracy'] is None


# ── 2. Target & Feature Leakage Audit ──────────────────────────────────────────

def test_no_target_or_post_investigation_leakage_in_features():
    """FEATURE_COLS must never contain is_laundering or target-derived fields."""
    forbidden_tokens = [
        'is_laundering', 'target', 'fraud', 'label', 'risk_score',
        'sar_filed', 'str_filed', 'case_status', 'closure_disposition',
        'is_suspicious', 'investigation_status', 'analyst_notes'
    ]
    for col in FEATURE_COLS:
        for token in forbidden_tokens:
            assert col.lower() != token, f"Feature leakage detected! Column '{col}' matches forbidden token '{token}'."


def test_feature_list_is_deterministic_and_matches_components():
    """Total feature count must match base (12) + graph (9) + customer (7) = 28 features."""
    assert len(BASE_FEATURE_COLS) == 12
    assert len(GRAPH_FEATURE_COLS) == 9
    assert len(CUSTOMER_FEATURE_COLS) == 7
    assert len(FEATURE_COLS) == 28
    assert FEATURE_COLS == BASE_FEATURE_COLS + GRAPH_FEATURE_COLS + CUSTOMER_FEATURE_COLS


# ── 3. Single-Class Test Sets & Edge Cases ─────────────────────────────────────

def test_single_class_all_zeros_handled_safely():
    """Single-class test set (all legitimate) returns valid accuracy and None for undefined metrics."""
    y_true = np.array([0, 0, 0, 0, 0, 0])
    y_prob = np.array([0.1, 0.2, 0.05, 0.15, 0.4, 0.25])
    
    metrics = compute_all_aml_metrics(y_true, y_prob, threshold=0.5)
    
    assert metrics['accuracy'] == 1.0
    assert metrics['recall'] is None  # Zero positives in ground truth -> recall undefined
    assert metrics['f1_score'] is None
    assert metrics['roc_auc'] is None  # ROC-AUC undefined for single class
    assert metrics['pr_auc'] is None
    # Ensure no NaN or Inf in dictionary
    for k, v in metrics.items():
        if isinstance(v, float):
            assert not np.isnan(v), f"Metric '{k}' contains NaN"
            assert not np.isinf(v), f"Metric '{k}' contains Inf"


def test_invalid_predictions_with_nan_inf_handled_safely():
    """Probabilities containing NaN or Inf must be safely sanitized without crashing."""
    y_true = np.array([0, 1, 0, 1])
    y_prob = np.array([np.nan, np.inf, -np.inf, 0.8])
    
    metrics = compute_all_aml_metrics(y_true, y_prob, threshold=0.5)
    assert metrics['accuracy'] is not None
    assert isinstance(metrics['accuracy'], float)


# ── 4. Split Partitioning Integrity ───────────────────────────────────────────

def test_temporal_split_chronological_integrity():
    """Temporal split must guarantee test transactions are strictly after train transactions."""
    dates = [datetime(2025, 1, 1) + timedelta(days=i) for i in range(100)]
    df = pd.DataFrame({
        'timestamp': dates,
        'sender_account': [f"ACC{i % 10}" for i in range(100)],
        'is_laundering': [1 if i % 10 == 0 else 0 for i in range(100)]
    })
    
    train_df, val_df, test_df = temporal_split(df, train_ratio=0.70, val_ratio=0.15)
    
    assert len(train_df) == 70
    assert len(val_df) == 15
    assert len(test_df) == 15
    assert train_df['timestamp'].max() <= val_df['timestamp'].min()
    assert val_df['timestamp'].max() <= test_df['timestamp'].min()


def test_account_disjoint_split_zero_sender_overlap():
    """Account-disjoint split must ensure senders in train and test are completely disjoint."""
    np.random.seed(42)
    accounts = [f"ACC{i}" for i in range(50)]
    rows = []
    for _ in range(300):
        acc = np.random.choice(accounts)
        is_fraud = 1 if acc in accounts[:5] and np.random.random() < 0.6 else 0
        rows.append({
            'sender_account': acc,
            'timestamp': datetime(2025, 1, 1) + timedelta(minutes=len(rows)),
            'is_laundering': is_fraud
        })
    df = pd.DataFrame(rows)
    
    train_df, val_df, test_df = account_disjoint_split(df, train_ratio=0.70, val_ratio=0.15)
    
    train_senders = set(train_df['sender_account'])
    val_senders = set(val_df['sender_account'])
    test_senders = set(test_df['sender_account'])
    
    assert len(train_senders.intersection(test_senders)) == 0, "Train and test senders must be strictly disjoint!"
    assert len(train_senders.intersection(val_senders)) == 0, "Train and val senders must be strictly disjoint!"
    assert len(val_senders.intersection(test_senders)) == 0, "Val and test senders must be strictly disjoint!"


# ── 5. Continuous Scoring for ROC-AUC & Mathematical Consistency ───────────────

def test_roc_auc_requires_continuous_probabilities():
    """ROC-AUC must rank probabilities continuously and be sensitive to probability order."""
    y_true = np.array([0, 0, 1, 1])
    # Continuous probabilities with perfect ordering
    probs_perfect = np.array([0.1, 0.2, 0.8, 0.9])
    # Degraded ordering
    probs_degraded = np.array([0.4, 0.6, 0.5, 0.7])
    
    m_perf = compute_all_aml_metrics(y_true, probs_perfect, threshold=0.5)
    m_deg = compute_all_aml_metrics(y_true, probs_degraded, threshold=0.5)
    
    assert m_perf['roc_auc'] == 1.0
    assert m_deg['roc_auc'] < 1.0


def test_f1_score_mathematical_agreement_with_precision_and_recall():
    """F1-score must mathematically agree with 2 * (P * R) / (P + R)."""
    y_true = np.array([0, 0, 0, 1, 1, 1, 0, 1])
    y_prob = np.array([0.1, 0.6, 0.2, 0.8, 0.7, 0.4, 0.3, 0.9])
    
    metrics = compute_all_aml_metrics(y_true, y_prob, threshold=0.5)
    p = metrics['precision']
    r = metrics['recall']
    f1 = metrics['f1_score']
    
    if p + r > 0:
        expected_f1 = (2 * p * r) / (p + r)
        assert abs(f1 - expected_f1) < 1e-6
