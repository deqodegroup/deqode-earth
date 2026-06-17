"""Record a source run outcome in the operational health ledger."""

import os
import sys

from supabase import create_client


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: record_source_health.py SOURCE STATUS CADENCE")

    source, status, cadence = sys.argv[1:]
    normalized_status = "healthy" if status == "success" else "failed"
    client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )
    client.rpc(
        "record_data_source_run",
        {
            "p_source": source,
            "p_status": normalized_status,
            "p_cadence": cadence,
        },
    ).execute()


if __name__ == "__main__":
    main()
