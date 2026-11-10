"""
Tests for db.py's connection pre-ping/retry logic — a stale pooled
connection (Supabase's pooler closes idle ones server-side) must be
discarded rather than handed back out, or every future checkout fails
forever with "server closed the connection unexpectedly" until the whole
process restarts.
"""
from unittest.mock import MagicMock, patch

import pytest

import db


def _make_pool(conns):
    """conns: list of mock connection objects, returned by getconn() in
    order. maxconn bounds the retry loop the same way the real pool would."""
    pool = MagicMock()
    pool.maxconn = max(len(conns), 1)
    pool.getconn.side_effect = list(conns)
    return pool


def _healthy_conn():
    conn = MagicMock()
    conn.cursor.return_value.execute.return_value = None
    return conn


def _dead_conn():
    conn = MagicMock()
    conn.cursor.return_value.execute.side_effect = db.psycopg2.DatabaseError(
        "server closed the connection unexpectedly"
    )
    return conn


def test_get_conn_yields_a_healthy_connection_unchanged():
    conn = _healthy_conn()
    pool = _make_pool([conn])
    with patch.object(db, "_get_pool", return_value=pool):
        with db.get_conn() as c:
            assert c is conn
    conn.commit.assert_called_once()
    pool.putconn.assert_called_once_with(conn)


def test_discards_one_stale_connection_and_retries_for_a_healthy_one():
    dead = _dead_conn()
    healthy = _healthy_conn()
    pool = _make_pool([dead, healthy])
    with patch.object(db, "_get_pool", return_value=pool):
        with db.get_conn() as c:
            assert c is healthy
    # The dead one is discarded (closed), never handed to the caller or
    # returned to the pool for reuse.
    pool.putconn.assert_any_call(dead, close=True)
    pool.putconn.assert_called_with(healthy)


def test_all_pooled_connections_stale_raises_the_last_error_not_hangs():
    dead1, dead2 = _dead_conn(), _dead_conn()
    pool = _make_pool([dead1, dead2])
    with patch.object(db, "_get_pool", return_value=pool):
        with pytest.raises(db.psycopg2.DatabaseError):
            with db.get_conn():
                pass
    assert pool.putconn.call_count == 2


def test_caller_exception_still_rolls_back_a_healthy_connection():
    conn = _healthy_conn()
    pool = _make_pool([conn])
    with patch.object(db, "_get_pool", return_value=pool):
        with pytest.raises(ValueError):
            with db.get_conn() as c:
                raise ValueError("boom")
    conn.rollback.assert_called_once()
    conn.commit.assert_not_called()
    pool.putconn.assert_called_once_with(conn)
