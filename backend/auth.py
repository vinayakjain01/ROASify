# ╔══════════════════════════════════════════════════════════════════════╗
# ║  auth.py — verifies Supabase-issued session tokens, loads the caller's║
# ║  role/team from our own `profiles` table                             ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# We never issue or store passwords/sessions ourselves — Supabase Auth does
# that. This module only verifies the token Supabase already issued (via its
# published JWKS) and looks up what WE know about that user: role + team.

import os
from dataclasses import dataclass

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, Depends

from db import get_conn

_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        jwks_url = os.getenv("SUPABASE_JWKS_URL")
        if not jwks_url:
            raise RuntimeError("SUPABASE_JWKS_URL is not configured on the server.")
        _jwk_client = PyJWKClient(jwks_url)
    return _jwk_client


@dataclass
class CurrentUser:
    id: str
    email: str
    role: str                 # 'admin' | 'member'
    team_id: str | None       # None until an admin assigns a team


def get_current_user(authorization: str = Header(None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    token = authorization.split(" ", 1)[1].strip()

    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except Exception:
        # Deliberately generic — never leak whether the token was expired,
        # malformed, or forged; all three just mean "not logged in."
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    user_id = claims["sub"]

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("select email, role, team_id from profiles where id = %s", (user_id,))
        row = cur.fetchone()

    if row is None:
        # A real Supabase login, but no matching profiles row — shouldn't
        # happen (the on_auth_user_created trigger creates one on signup),
        # but fail closed rather than treat them as a teamless member.
        raise HTTPException(status_code=403, detail="No profile found for this account.")

    email, role, team_id = row
    return CurrentUser(id=user_id, email=email, role=role, team_id=str(team_id) if team_id else None)


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def _get_team_brand_ids(team_id: str) -> list[str]:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("select brand_id from team_brands where team_id = %s", (team_id,))
        return [r[0] for r in cur.fetchall()]


def user_allowed_brand_ids(user: CurrentUser) -> list[str] | None:
    """None means unrestricted (admin sees every GrowifyOS brand). Otherwise
    the list of brandIds the user's team is allowed to see — empty if they
    have no team assigned yet, not an error."""
    if user.role == "admin":
        return None
    if not user.team_id:
        return []
    return _get_team_brand_ids(user.team_id)


def ensure_brand_access(user: CurrentUser, brand_id: str) -> None:
    allowed = user_allowed_brand_ids(user)
    if allowed is not None and brand_id not in allowed:
        raise HTTPException(status_code=403, detail="You don't have access to this brand.")
