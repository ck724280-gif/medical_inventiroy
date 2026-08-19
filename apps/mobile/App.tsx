import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  ShoppingCart,
  Boxes,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  QrCode,
} from 'lucide-react-native';

interface CartItem {
  medicineId: string;
  name: string;
  batchNumber: string;
  qty: number;
  rate: number;
  total: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'scanner' | 'inventory'>('pos');
  const [cart, setCart] = useState<CartItem[]>([
    {
      medicineId: '1',
      name: 'Paracetamol 650mg (Dolo)',
      batchNumber: 'DL-2026-08',
      qty: 2,
      rate: 30.5,
      total: 61.0,
    },
    {
      medicineId: '2',
      name: 'Amoxicillin 500mg',
      batchNumber: 'AMX-998',
      qty: 1,
      rate: 75.0,
      total: 75.0,
    },
  ]);

  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleScanBarcode = () => {
    // Quick barcode simulation for testing & camera hook
    const newItem: CartItem = {
      medicineId: Date.now().toString(),
      name: 'Azithromycin 500mg',
      batchNumber: 'AZI-2026',
      qty: 1,
      rate: 120.0,
      total: 120.0,
    };
    setCart([...cart, newItem]);
    Alert.alert('Scanned Medicine', 'Azithromycin 500mg added to mobile cart!');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Scan items first');
      return;
    }
    setShowReceiptModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Mobile Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MedCare Pharmacy</Text>
          <Text style={styles.headerSubtitle}>Mobile POS & Barcode Scanner</Text>
        </View>
        <TouchableOpacity style={styles.scanBtn} onPress={handleScanBarcode}>
          <QrCode color="#fff" size={20} />
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        <View style={styles.cartHeader}>
          <Text style={styles.sectionTitle}>Cart Items ({cart.length})</Text>
          <TouchableOpacity onPress={() => setCart([])}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cart}
          keyExtractor={(item) => item.medicineId}
          renderItem={({ item, index }) => (
            <View style={styles.cartItemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemBatch}>Batch: {item.batchNumber}</Text>
                <Text style={styles.itemRate}>₹{item.rate.toFixed(2)} each</Text>
              </View>

              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => {
                    if (item.qty > 1) {
                      const updated = [...cart];
                      updated[index].qty -= 1;
                      updated[index].total = updated[index].qty * updated[index].rate;
                      setCart(updated);
                    }
                  }}
                >
                  <Minus color="#0f172a" size={14} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => {
                    const updated = [...cart];
                    updated[index].qty += 1;
                    updated[index].total = updated[index].qty * updated[index].rate;
                    setCart(updated);
                  }}
                >
                  <Plus color="#0f172a" size={14} />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotal}>₹{item.total.toFixed(2)}</Text>
            </View>
          )}
        />

        {/* Bottom Checkout Panel */}
        <View style={styles.bottomPanel}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total:</Text>
            <Text style={styles.totalAmount}>₹{grandTotal.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <CheckCircle color="#fff" size={18} style={{ marginRight: 6 }} />
            <Text style={styles.checkoutBtnText}>Checkout & Bluetooth Print</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thermal Receipt Confirmation Modal */}
      <Modal visible={showReceiptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sale Completed Successfully!</Text>
            <Text style={styles.modalText}>
              Invoice #MOB-INV-{Date.now().toString(36).toUpperCase()} generated.
            </Text>
            <Text style={styles.modalText}>
              Sent print job to default 58mm Bluetooth thermal printer.
            </Text>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowReceiptModal(false);
                setCart([]);
              }}
            >
              <Text style={styles.doneBtnText}>Start New Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#0284c7',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#e0f2fe',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0369a1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  clearText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  cartItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  itemBatch: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  itemRate: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 2,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 4,
    marginHorizontal: 8,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    paddingHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  bottomPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  checkoutBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 6,
  },
  doneBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
