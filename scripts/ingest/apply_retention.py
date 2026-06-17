"""Apply database retention rules for operational DEQODE Earth data."""

import os

from supabase import create_client


def main() -> None:
    client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )
    result = client.rpc("apply_data_retention").execute()
    print(f"OK: retention applied -- {result.data}")


if __name__ == "__main__":
    main()
