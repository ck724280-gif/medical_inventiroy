# 💬 Module Documentation: WhatsApp Web Quick Share (`/whatsapp`)

---

## 🎯 1. Overview & Business Purpose
The **WhatsApp Integration** module allows cashiers and pharmacists to instantly send digital bill summaries, PDF receipt links, and payment reminder messages directly to customers via **WhatsApp Web** with zero third-party API dependencies or messaging costs.

---

## 🚀 2. How It Works (Click-to-Chat Flow)

1. **POS Checkout Completion**:
   - Immediately upon completing a bill in POS, a **"Share Receipt on WhatsApp"** button is displayed.
2. **Dynamic Message Formatting**:
   - Generates a pre-filled, professional WhatsApp text:
     ```text
     🏥 *MEDCARE PHARMACY*
     Invoice #: INV-000105
     Date: 26/08/2026

     Dear Rajesh Kumar,
     Thank you for your purchase. Here is your bill summary:

     Total Items: 3
     Net Payable: ₹450.00
     Paid Mode: CASH

     📄 View/Download Bill: https://medcare.com/receipt/INV-000105

     Get well soon! 🙏
     ```
3. **1-Click Web Redirect**:
   - Clicking opens `https://web.whatsapp.com/send?phone=91XXXXXXXXXX&text=...` directly in the browser.
   - On mobile/tablet, it seamlessly opens the native WhatsApp app.

---

## 🛡️ 3. Security & Privacy
* No customer chat logs or WhatsApp credentials are stored on external servers.
* Uses official standard `https://api.whatsapp.com/send` URL encoding protocol.
