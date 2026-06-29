from fastapi import HTTPException, status

ROLE_PERMISSIONS = {
    "admin": {
        "users:manage",
        "components:approve",
        "components:delete",
        "prompts:edit",
        "prompts:delete",
        "tokens:manage",
        "analytics:read",
    },
    "designer": {"components:create", "components:edit", "components:submit", "prompts:edit", "tokens:manage", "uploads:create"},
    "developer": {"marketplace:read", "generation:create", "generation:save", "exports:create"},
}


def ensure_permission(role: str, permission: str) -> None:
    if permission not in ROLE_PERMISSIONS.get(role, set()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
