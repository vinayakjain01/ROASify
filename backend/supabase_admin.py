# ╔══════════════════════════════════════════════════════════════════════╗
# ║  supabase_admin.py — creates new logins via Supabase's own Auth API   ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Everything else in this app talks to Supabase as a Postgres database
# (db.py). Creating a *login* is different — it has to go through Supabase
# Auth's own REST API (GoTrue) using the service/secret key, not a raw SQL
# insert into auth.users, which is unsupported and easy to get subtly wrong
# (password hash format, required trigger-adjacent fields, etc.).

import os

import requests

DEFAULT_TIMEOUT = 15


class SupabaseAdminError(Exception):
    """Raised when inviting a user fails. Never includes the service key in
    its message — safe to log or return to the client."""


def invite_user(email: str) -> dict:
    """Creates the user in Supabase Auth and emails them a link to set their
    own password. Our on_auth_user_created trigger creates their `profiles`
    row automatically (role='member', no team) — the admin assigns role/team
    afterward from the Users tab."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY")
    if not url:
        raise SupabaseAdminError("SUPABASE_URL is not configured on the server.")
    if not key:
        raise SupabaseAdminError("SUPABASE_SECRET_KEY is not configured on the server.")

    try:
        resp = requests.post(
            f"{url.rstrip('/')}/auth/v1/invite",
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"email": email},
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        raise SupabaseAdminError("Supabase Auth timed out sending the invite.")
    except requests.exceptions.RequestException as e:
        raise SupabaseAdminError(f"Supabase Auth request failed ({e.__class__.__name__}).")

    if resp.status_code >= 400:
        reason = None
        try:
            body = resp.json()
            reason = body.get("msg") or body.get("error_description") or body.get("message")
        except ValueError:
            pass
        detail = f" — {reason}" if reason else ""
        raise SupabaseAdminError(f"Could not invite user (HTTP {resp.status_code}){detail}.")

    try:
        return resp.json()
    except ValueError:
        raise SupabaseAdminError("Supabase Auth returned a non-JSON response.")
