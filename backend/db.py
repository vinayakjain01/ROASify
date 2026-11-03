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


@contextmanager
def get_conn():
    """Checks a connection out of the pool, commits on success, rolls back
    and re-raises on error, always returns the connection to the pool."""
    conn = _get_pool().getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _get_pool().putconn(conn)
