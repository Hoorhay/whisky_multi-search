import os
import sys
import time
import urllib.parse
import webbrowser


def main():
    if len(sys.argv) < 2:
        print("Usage: python search_for_whisky.py <search_term>")
        sys.exit(1)

    # Silence stdout/stderr output originating from browser sub-processes
    null_out = open(os.devnull, "w")
    sys.stdout.flush()
    os.dup2(null_out.fileno(), 1)
    os.dup2(null_out.fileno(), 2)

    raw_query = " ".join(sys.argv[1:])
    encoded_query = urllib.parse.quote(raw_query)

    urls = [
        f"https://www.svetnapojov.sk/vyhladavanie?search={encoded_query}",
        f"https://www.deinwhisky.de/search?sSearch={encoded_query}",
        f"https://shop.whiskybase.com/us/search/{encoded_query}/",
        f"https://www.whiskysite.nl/en/search/{encoded_query}/",
        f"https://www.passionforwhisky.com/en/search?controller=search&s={encoded_query}",
        f"https://www.alkohol.cz/produkty/uigedail/vyhledavani/?q={encoded_query}",
        f"https://www.dramtime.eu/?s={encoded_query}&post_type=product&dgwt_wcas=1&lang=en",
    ]

    for url in urls:
        webbrowser.open_new_tab(url)
        time.sleep(0.2)  # Short pause helps KDE/Qt browsers spawn tabs cleanly


if __name__ == "__main__":
    main()
