
in case of: ID not found is stay in https://line.me/ and  p tag contain "404 Not Found"
in case of: ID actually exists is stay in https://line.me/ and title tag is "Add LINE friend" and p tag contain "Scan QR code to add friend"
in case of: ID actually exists is redirect to https://page.line.me/
in case of: ID has been suspended is redirect to https://store.line.me 

1. store.line.me → SUSPENDED
2. page.line.me → ACTIVE
3. line.me + 404 text or httpStatus === 404 → NOT_FOUND
4. line.me + title + scan text → ACTIVE
5. else → UNKNOWN