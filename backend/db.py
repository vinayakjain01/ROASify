# ╔══════════════════════════════════════════════════════════════════════╗
# ║  db.py — thin Postgres (Supabase) connection pool                     ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Used for the team/user/brand-access data (profiles/teams/team_brands),
# never for GrowifyOS data — that stays entirely in GrowifyOS, fetched
# fresh on every sync via integrations/growifyos_client.py.

import os
from contextlib import contextmanager

import psycopg2
from psycopg2 import pool as pg_pool

_pool: pg_pool.SimpleConnectionPool | None = None


def _get_pool() -> pg_pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            raise RuntimeError("DATABASE_URL is not configured on the server.")
        _pool = pg_pool.SimpleConnectionPool(1, 5, dsn)
    return _pool


def _checkout_live_conn():
    """SimpleConnectionPool never validates a connection before handing it
    out — Supabase's pooler closes idle connections server-side, and once
    that happens every future checkout of that same (dead) connection object
    fails with "server closed the connection unexpectedly", forever, until
    the whole process restarts. Ping each candidate with a cheap query and
    discard (not return) a dead one instead of reusing it, bounded by the
    pool's own maxconn so this can't loop forever if the DB is genuinely
    unreachable."""
    pool = _get_pool()
    last_error: Exception | None = None
    for _ in range(pool.maxconn):
        conn = pool.getconn()
        try:
            conn.cursor().execute("SELECT 1")
            return conn
        except Exception as e:
            last_error = e
            pool.putconn(conn, close=True)
    raise last_error


@contextmanager
def get_conn():
    """Checks a connection out of the pool, commits on success, rolls back
    and re-raises on error, always returns the connection to the pool."""
    conn = _checkout_live_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _get_pool().putconn(conn)
