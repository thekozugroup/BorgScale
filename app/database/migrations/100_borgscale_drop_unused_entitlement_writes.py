"""Migration 100: deprecation marker for unused entitlement writes.

BorgScale stops writing to the entitlement_id column. The column itself
is intentionally NOT dropped — historical migrations 051/052 created
analytics columns that are likewise retained. This migration is a no-op
that records the deprecation for future readers.
"""

def run(_connection) -> None:
    pass


def rollback(_connection) -> None:
    pass
