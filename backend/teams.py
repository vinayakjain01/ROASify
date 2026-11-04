# ╔══════════════════════════════════════════════════════════════════════╗
# ║  teams.py — team/user/brand-access administration                     ║
# ╚══════════════════════════════════════════════════════════════════════╝
#
# Backs the admin UI (/api/admin/*) and the auto-resolution that makes a
# newly-connected GrowifyOS brand show up for its team automatically, with
# no admin action required.

from db import get_conn


def ensure_profile_exists(user_id: str, email: str) -> None:
    """Backstop for the on_auth_user_created trigger, which turns out not to
    fire reliably for users created via Supabase's /invite API (it does fire
    for users added through the Supabase dashboard) — confirmed by a real
    invited user whose auth.users row existed with no matching profiles row.
    Called right after every successful invite so this can't happen silently
    again, regardless of whether the trigger ever gets fixed upstream."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "insert into profiles (id, email) values (%s, %s) on conflict (id) do nothing",
            (user_id, email),
        )


def sync_team_brands_from_live_list(live_brands: list) -> None:
    """For every live GrowifyOS brand whose name matches a team_brand_names
    entry, ensure team_brands has that (team_id, brandId) row. Called every
    time /api/brands fetches the live list — this is what makes a brand
    automatically show up for its team the moment it's connected."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("select lower(brand_name), team_id from team_brand_names")
        name_to_team = {name: team_id for name, team_id in cur.fetchall()}
        if not name_to_team:
            return
        for b in live_brands:
            team_id = name_to_team.get(str(b.get("name") or "").strip().lower())
            if team_id:
                cur.execute(
                    "insert into team_brands (team_id, brand_id) values (%s, %s) on conflict do nothing",
                    (team_id, b.get("brandId")),
                )


# ── Teams ────────────────────────────────────────────────────────────────

def list_teams() -> list:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("select id, name from teams order by name")
        return [{"id": str(r[0]), "name": r[1]} for r in cur.fetchall()]


def set_own_team_if_unset(user_id: str, team_id: str) -> dict:
    """Lets a member pick their own team exactly once — the WHERE clause
    makes this atomic (no separate check-then-set race), and it's the only
    path that can ever change a member's team without going through the
    admin-only update_user(). Once team_id is set, this always fails,
    forcing any future change through an admin."""
    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """update profiles set team_id = %s where id = %s and team_id is null
                   returning id, email, role, team_id""",
                (team_id, user_id),
            )
        except Exception:
            raise ValueError("That team doesn't exist.")
        row = cur.fetchone()
        if row is None:
            raise ValueError("Your team is already set — ask an admin to change it.")
        return {"id": str(row[0]), "email": row[1], "role": row[2], "teamId": str(row[3])}


def create_team(name: str) -> dict:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "insert into teams (name) values (%s) on conflict (name) do update set name = excluded.name returning id, name",
            (name,),
        )
        row = cur.fetchone()
        return {"id": str(row[0]), "name": row[1]}


# ── Users ────────────────────────────────────────────────────────────────

def list_users() -> list:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            select p.id, p.email, p.role, p.team_id, t.name
            from profiles p left join teams t on t.id = p.team_id
            order by p.email
        """)
        return [
            {"id": str(r[0]), "email": r[1], "role": r[2],
             "teamId": str(r[3]) if r[3] else None, "teamName": r[4]}
            for r in cur.fetchall()
        ]


def update_user(user_id: str, role: str | None, team_id: str | None, clear_team: bool) -> dict:
    sets, params = [], []
    if role is not None:
        sets.append("role = %s")
        params.append(role)
    if clear_team:
        sets.append("team_id = NULL")
    elif team_id is not None:
        sets.append("team_id = %s")
        params.append(team_id)
    if not sets:
        raise ValueError("Nothing to update.")
    params.append(user_id)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(f"update profiles set {', '.join(sets)} where id = %s returning id, email, role, team_id", params)
        row = cur.fetchone()
        if row is None:
            raise ValueError("No such user.")
        return {"id": str(row[0]), "email": row[1], "role": row[2], "teamId": str(row[3]) if row[3] else None}


# ── Brand names (pending, matched by name before a brand is connected) ───

def list_brand_names() -> list:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            select tbn.id, tbn.brand_name, tbn.team_id, t.name
            from team_brand_names tbn join teams t on t.id = tbn.team_id
            order by tbn.brand_name
        """)
        return [
            {"id": str(r[0]), "brandName": r[1], "teamId": str(r[2]), "teamName": r[3]}
            for r in cur.fetchall()
        ]


def create_brand_name(brand_name: str, team_id: str) -> dict:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """insert into team_brand_names (team_id, brand_name) values (%s, %s)
               on conflict (brand_name) do update set team_id = excluded.team_id
               returning id, brand_name, team_id""",
            (team_id, brand_name),
        )
        row = cur.fetchone()
        return {"id": str(row[0]), "brandName": row[1], "teamId": str(row[2])}


def delete_brand_name(entry_id: str) -> None:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("delete from team_brand_names where id = %s", (entry_id,))


# ── Brand assignments (direct, by live GrowifyOS brandId) ──────────────

def get_team_brand_assignments() -> dict:
    """{brandId: team_id} for every explicit assignment."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("select brand_id, team_id from team_brands")
        return {r[0]: str(r[1]) for r in cur.fetchall()}


def set_brand_team(brand_id: str, team_id: str | None) -> None:
    """A brand belongs to at most one team — clear any existing assignment
    before applying the new one (or just clear it, if team_id is None)."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("delete from team_brands where brand_id = %s", (brand_id,))
        if team_id is not None:
            cur.execute("insert into team_brands (team_id, brand_id) values (%s, %s)", (team_id, brand_id))
