# 📦 Complete Buyer's Guide & Manual: Inventory Batches & Automated FEFO Engine (`/inventory`)

> **Target Audience:** Pharmacy Owners, Store Managers, Warehouse Heads, Inventory Controllers, and Software Buyers.

---

## 🌟 1. Executive Summary: The Expiry & Dead Stock Nightmare

Pharmaceutical business ka sabse bada profit killer (munafey ko khane wala dushman) hota hai: **"Expired Stock & Unmanaged Batches."**

Har mahine ek average medical store par ₹10,000 se ₹50,000 tak ki dawaiyan shelf ke piche padi-padi expire ho jati hain. Kyun?
- Kyunki jab distributor se naya stock aata hai, to ladka purane stock ko piche dhakel kar naya stock aage rakh deta hai.
- Cashier POS par bill banate waqt saamne rakha naya batch bech deta hai aur purana batch expire ho jata hai.
- Jab dukan me 5,000 medicines hoti hain, to kisi insaan ke dimaag ke liye ye yaad rakhna namumkin hai ki kis dappe me rakhi dawa kab expire hone wali hai.

**MedCare Batch & FEFO Engine** is problem ko jad se khatam karne ke liye banaya gaya hai. Yeh software har ek strip par chhape **Batch Number** aur **Expiry Date** ko track karta hai aur automated **FEFO (First-Expiry-First-Out)** algorithm ke zariye dukan ki expiry loss ko **95% tak reduce** kar deta hai.

---

## 🧠 2. How the FEFO Engine Works (First-Expiry-First-Out)

FEFO ka matlab hota hai: **"Jo dawa pehle expire hone wali hai, software usko sabse pehle bechega."**

```mermaid
graph TD
    A[🛒 POS Counter: Customer requests 15 Strips of Azithromycin 500] --> B[🔍 Software Scans Branch Inventory Batches]
    B --> C[Batch A: Exp 2026-10 | Stock: 10 Strips | MRP: ₹120]
    B --> D[Batch B: Exp 2027-04 | Stock: 20 Strips | MRP: ₹125]
    B --> E[Batch C: Exp 2027-12 | Stock: 50 Strips | MRP: ₹130]
    C -->|Auto-Picks ALL 10 Strips| F[Allocate 10 from Batch A]
    D -->|Auto-Picks REMAINING 5 Strips| G[Allocate 5 from Batch B]
    F --> H[🎯 Total 15 Strips Allocated Seamlessly in 1 Bill]
    G --> H
```

### Business Benefits of this Engine:
1. **Zero Cashier Effort:** Cashier ko dabba dekh kar batch dhundhne ki jarurat nahi hai, software automatically bill me sabse pehle expire hone wala batch daal deta hai.
2. **Multi-Batch Split in Single Line:** Agar purane batch me sirf 10 strips the aur customer ne 15 strips mange, to software 10 strips Batch A se aur baki 5 strips Batch B se seamlessly nikal deta hai!

---

## 📊 3. Understanding Batch Attributes & Quantities

MedCare Inventory me har batch ke paas 4 alag-alag quantity buckets hoti hain:

| Quantity Type | Kya Matlab Hai? | Kahan Dikhta Hai? |
|---|---|---|
| **`currentQty` (Sellable Stock)** | Dukan ke rack me rakha hua bilkul fresh, accha stock jo POS par bikne ke liye ready hai. | POS Search & Inventory List |
| **`reservedQty` (Locked Stock)** | Kisi customer ke cart me ya inter-branch transfer ke liye pack kiya gaya stock. | In-Transit / Pending Cart |
| **`damagedQty` (Quarantined Stock)** | Tooti hui bottle, mud gayi strip ya damaged seal wali dawaiyan. **(POS me bikna strictly blocked hota hai!)** | Damage & Return Register |
| **`expiredQty` (Expired Stock)** | Jo dawa expire ho chuki hai. Yeh dukan me alag quarantined rehti hai taaki distributor ko wapas karke Credit Note liya ja sake. | Expiry Claim Report |

---

## ⏳ 4. The 3-Tier Expiry Radar (30 / 60 / 90 Days Alert)

Inventory dashboard par 3-stage visual color alert system chalta hai:

```text
🔴 RED ZONE (0 to 30 Days Left): Critical Expiry Alert!
   -> Dawa agle 30 din me expire hone wali hai.
   -> Action: Distributor ko return karein ya 20% discount offer laga kar clearance sale karein.

🟡 YELLOW ZONE (31 to 60 Days Left): Medium Alert!
   -> Dawa agle 2 mahine me expire hogi.
   -> Action: Doctor ko notify karein aur staff ko first-shelf display par lagane ko kahein.

🔵 BLUE ZONE (61 to 90 Days Left): Early Warning!
   -> Dawa agle 3 mahine me expire hogi.
   -> Action: Naya purchase order lagane se pehle is batch ko monitor karein.
```

---

## 🛠️ 5. Physical Stock Adjustment & Reconciliation (Audit Mode)

Mahine me ek baar har medical store par physical stock verification (dawaiyo ki ginti) hoti hai.
Agar ginti karte waqt pata chala ki system me 50 strips dikha raha hai lekin physical dappe me sirf 48 strips hain (2 strips kho gayi ya tut gayi):
1. Pharmacist **"Stock Adjustment"** button par click karta hai.
2. Dawa aur Batch number select karta hai.
3. Adjustment Type: **`DEDUCT_STOCK`** select karta hai.
4. Quantity: `2` aur Reason: `Damaged in handling` likhkar submit karta hai.
5. System inventory ko 50 se 48 par update kar deta hai aur Audit log me permanent record save kar deta hai ki kis staff member ne ye adjustment kiya!

---

## 🛡️ 6. Common Inventory Disasters Jo Yeh Module Prevent Karta Hai

1. **Expired Dawa Ka Customer Ko Chale Jana (Drug Inspector Raid):**
   * *Traditional Software:* Expired dawa aur fresh dawa ek hi stock me mix rehti hai. Galti se patient ko expired dawa mil jati hai.
   * *MedCare:* Expiry date aate hi batch automatically POS me **RED LOCKED** ho jata hai. Koi bhi cashier chah kar bhi expired dawa ka bill nahi bana sakta!
2. **Duplicate Batch Numbers:**
   * *Traditional Software:* Ek hi batch do alag-alag rates par enter ho jata hai jisse hisab bigad jata hai.
   * *MedCare:* `(medicineId, branchId, batchNumber)` par unique constraint hai jisse stock ek hi batch me merge hota hai.

---

## ❓ 7. Buyer FAQs

**Q1: Agar kisi dawa ke 5 alag-alag batches hain jinki MRP alag-alag hai, to system rate kaise lagayega?**
* **Ans:** Har batch ka apna MRP, Purchase Price aur Selling Rate alag store hota hai. Jis batch ka maal becha jayega, us batch ki exact MRP bill par print hogi.

**Q2: Kya hum expired medicines ka claim report distributor ko bhej sakte hain?**
* **Ans:** Haan! Expiry reports section se 1-click me supplier-wise expired batches ki Excel list generate ho jati hai jise aap distributor ko credit note ke liye de sakte hain.
