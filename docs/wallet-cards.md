# Mock Wallet cards

.sct creates a mock Apple Wallet card and sends it to an iPhone through AirDrop.
The card is a generic Wallet pass with fake demonstration data. It is not a payment card.
The recipient needs no .sct app and no paid Apple Developer membership.

This is a post-MVP experiment. See issue #40.
This feature is only on the `experimental` branch. The stable `main` branch does not have it.

## Signing service

Wallet accepts only a signed pass. .sct uses [walletmcppass.com](https://walletmcppass.com/) to sign the pass.
The service signs passes with its own Pass Type ID certificate, `pass.com.arshwaraich.vps`.

- No account, no API key, and no setup are necessary.
- The Mac must have an internet connection.
- The service allows 30 free calls each day for each IP address, while a shared pool of 500 free calls each day lasts.
  One card is one call. A failed call also counts. The limits reset at 00:00 UTC.
- After the free limit, the service asks for a payment of $0.01 in USDC through x402.
  .sct never pays. It shows a quota message, and you wait for the reset.
- The download link of the signed pass expires after 1 hour.
- walletmcppass.com is an independent project. Apple does not operate it.

.sct uses the REST endpoint `POST https://walletmcppass.com/api/passes`.
The same service also has an MCP endpoint, `https://walletmcppass.com/mcp`, with the same limits.
The service documents its parameters in [llms-full.txt](https://walletmcppass.com/llms-full.txt).

## Data that leaves the Mac

.sct sends these values to walletmcppass.com:

- The cardholder name and the card label from the form.
- The fixed text **Experimental — Not a payment card**.
- The organization name `.sct` and the Terminal theme colors.

.sct sends no secrets, no device keys, and no project data.
Type fake details only. The service can keep the request IP address, the pass style, and the organization name in its log.

## Create and send a card

1. Open **Cards**.
2. Type a fake cardholder name and a card label. Each field holds a maximum of 40 characters.
3. Select **Create and send to…**.
4. .sct requests the signed pass, downloads it, and checks it.
5. In the AirDrop picker, choose the iPhone.
6. On the iPhone, accept the pass, examine the preview, and tap **Add**.

A modal shows a credit card that moves from a Mac drawing to an iPhone drawing. See [send and receive animations](sharing.md#send-and-receive-animations).

If the iPhone is not in the picker, open Control Center on the iPhone.
Set AirDrop to **Everyone for 10 Minutes**. Turn on Wi-Fi and Bluetooth on both devices.

## Checks before the AirDrop picker opens

.sct shares the file only if all of these conditions are true:

- The file is 10 MiB or smaller.
- The file is a ZIP archive with `pass.json`, `manifest.json`, and `signature`.
- `pass.json` contains the text **Experimental — Not a payment card**.

## Delivery status

The AirDrop picker reports the same result for a sent file and for **Cancel**.
Thus .sct cannot know if the iPhone received the pass or added it to Wallet.
The status line and the modal caption tell you this after the picker closes.

.sct keeps signed passes in the `cards/outbox` folder of the app data.
.sct deletes that folder when the app starts and when the app quits.

## Known risk

walletmcppass.com says this: "On an iPhone, open the link in Safari; Wallet won't add a pass file handed over by another app."
It is possible that this limit also applies to a pass that arrives through AirDrop.
A test on a physical iPhone must examine this.

## Verification record

Record the results of a real AirDrop test here.

| Date | Mac and macOS version | iPhone and iOS version | Pass preview | Added to Wallet |
|---|---|---|---|---|
| Not tested yet | | | | |
