# 🤖 Module Documentation: Floatable AI Co-Pilot (`ai-copilot-drawer`)

---

## 🎯 1. Overview & Business Purpose
The **AI Co-Pilot** is an intelligent, floating pharmaceutical and business advisor built into the ERP. It provides instant answers on store sales, stock valuations, expiry predictions, and supplier debts, while featuring an intuitive **Floatable & Draggable UI** on both PC and Mobile.

---

## 🖱️ 2. Floatable & Draggable Controls

1. **💻 PC (Mouse Drag)**:
   - **Click & Hold** the floating `AI Co-Pilot [Ctrl+J]` button and drag it anywhere across the screen.
   - Releasing the mouse sets the button at that position.
2. **📱 Mobile / Tablet (Finger Touch Drag)**:
   - **Touch & Hold** the button and move it to any corner of the screen without covering other buttons.
3. **🎯 Smart Click vs Drag Separation**:
   - **Tap / Quick Click**: Opens the interactive AI chat drawer.
   - **Drag**: Moves the button without accidentally opening the drawer.
4. **💾 LocalStorage Position Persistence**:
   - The button's coordinates (`x`, `y`) are saved automatically to `localStorage.setItem('ai_copilot_float_pos')`.
   - Stays at the user's preferred screen position even after page refreshes.
5. **🛡️ Viewport Boundary Clamping**:
   - Clamped to an 8px margin from the screen borders so it cannot be lost off-screen.

---

## 💬 3. AI Capabilities & Quick Prompts

* **📊 Today's Sales & Profit**: *"Aaj ki total sales aur profit kitna hua?"*
* **⚠️ Expiry Alerts**: *"Show expiring medicines in next 60 days"*
* **📦 Stock Valuation**: *"Total inventory valuation across all branches"*
* **💳 Supplier Dues**: *"Suppliers aur distributors ka kitna payment baki hai?"*
* **⌨️ Shortcut**: Press **`Ctrl+J`** anywhere in the ERP to toggle.
