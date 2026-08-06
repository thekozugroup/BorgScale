"""Encrypt repository passphrases and the MQTT password that are stored in cleartext.

SSH private keys and TOTP secrets were already Fernet-encrypted, but
repositories.passphrase and system_settings.mqtt_password were written in the
clear. Anyone holding the SQLite file — a backup of it, a mounted volume, a host
snapshot — could read every passphrase and open every repository.

The column type now encrypts on write and tolerates a plaintext value on read,
so an instance keeps working before and after this runs. This migration
re-encrypts the rows already on disk.

Idempotent: a value that already decrypts is left alone, so a re-run (or a
partial previous run) cannot double-encrypt.
"""

import structlog
from sqlalchemy import text

logger = structlog.get_logger()


def _looks_encrypted(value: str) -> bool:
    """True when the value decrypts with the current key.

    Checked by decrypting rather than by matching the "gAAAAA" Fernet prefix,
    because a passphrase could legitimately start with those characters.
    """
    from app.core.security import decrypt_secret

    try:
        decrypt_secret(value)
        return True
    except Exception:
        return False


def _encrypt_column(db, table: str, column: str, key_column: str) -> int:
    from app.core.security import encrypt_secret

    try:
        rows = db.execute(
            text(
                f"SELECT {key_column}, {column} FROM {table} WHERE {column} IS NOT NULL AND {column} != ''"
            )
        ).fetchall()
    except Exception as e:
        # The table may not exist yet on a fresh database; create_all and the
        # earlier migrations will have made it by the time this matters.
        logger.warning(
            "Skipping secret encryption for missing table",
            table=table,
            error=str(e),
        )
        return 0

    encrypted = 0
    for key, value in rows:
        if _looks_encrypted(value):
            continue
        db.execute(
            text(f"UPDATE {table} SET {column} = :value WHERE {key_column} = :key"),
            {"value": encrypt_secret(value), "key": key},
        )
        encrypted += 1

    return encrypted


def upgrade(db):
    total = 0
    total += _encrypt_column(db, "repositories", "passphrase", "id")
    total += _encrypt_column(db, "system_settings", "mqtt_password", "id")
    db.commit()

    if total:
        logger.info("Encrypted secrets that were stored in cleartext", count=total)
    else:
        logger.info("No cleartext secrets found")


def downgrade(db):
    """Not supported.

    Rewriting these values as cleartext would undo the point of the migration.
    The column type reads encrypted and plaintext values alike, so an older
    build still functions against an upgraded database.
    """
    logger.warning("Downgrade not supported: secrets stay encrypted")
