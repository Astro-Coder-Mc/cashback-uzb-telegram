import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  auth, 
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  signInAnonymously,
  googleProvider,
  signInWithPopup
} from './firebase';
import { 
  Wallet, 
  QrCode, 
  Scan, 
  History as HistoryIcon, 
  X, 
  RefreshCw, 
  Store, 
  ArrowUpRight,
  User as UserIcon,
  Settings,
  Bell,
  CreditCard,
  ArrowDownLeft,
  ChevronRight,
  Gift,
  Star,
  Search as SearchIcon,
  Zap,
  LogOut,
  Info,
  ShieldCheck,
  Shield,
  TrendingUp,
  MapPin,
  Smartphone,
  Globe,
  Image as ImageIcon,
  HelpCircle,
  Store,
  Car,
  Building2,
  GraduationCap,
  Gamepad2,
  Tv,
  HeartPulse,
  Plane,
  Laptop,
  Monitor
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { onAuthStateChanged } from 'firebase/auth';

const partners = [
  { id: 1, name: 'Korzinka', cashback: '3%', color: 'bg-emerald-500', logo: 'K', icon: '🛒' },
  { id: 2, name: 'Makro', cashback: '2%', color: 'bg-red-500', logo: 'M', icon: '🛍️' },
  { id: 3, name: 'EVOS', cashback: '5%', color: 'bg-orange-500', logo: 'E', icon: '🍔' },
  { id: 4, name: 'Yandex Go', cashback: '4%', color: 'bg-yellow-500', logo: 'Y', icon: '🚕' },
  { id: 5, name: 'Bellstore', cashback: '7%', color: 'bg-pink-500', logo: 'B', icon: '💄' },
];

const specialOffers = [
  { id: 1, partner: 'EVOS', title: '10% Keshbek', description: 'Faqat bugun barcha buyurtmalar uchun', color: 'from-orange-500 to-red-500', icon: '🍔', tag: 'Qaynoq' },
  { id: 2, partner: 'Yandex Go', title: 'Birinchi manzil bepul', description: 'Yangi foydalanuvchilar uchun maxsus', color: 'from-yellow-400 to-yellow-600', icon: '🚕', tag: 'Yangi' },
  { id: 3, partner: 'Korzinka', title: '5X Bonus', description: 'Dam olish kunlari xaridlar uchun', color: 'from-emerald-400 to-teal-500', icon: '🛒', tag: 'Aksiya' },
];

export default function App() {
  const [isTMA, setIsTMA] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentService, setPaymentService] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferTarget, setTransferTarget] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isMerchantMode, setIsMerchantMode] = useState(false);
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllPartners, setShowAllPartners] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState([
    { id: 1, name: 'iPhone 13 Pro', location: 'Toshkent, O\'zbekiston', time: 'Hozir faol', type: 'mobile', current: true },
    { id: 2, name: 'MacBook Air M2', location: 'Toshkent, O\'zbekiston', time: '2 soat oldin', type: 'desktop', current: false },
    { id: 3, name: 'Windows PC', location: 'Samarqand, O\'zbekiston', time: 'Kecha, 14:30', type: 'desktop', current: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error?.message || String(error),
      operationType: operation,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        const tg = (window as any).Telegram?.WebApp;
        const tgUserData = tg?.initDataUnsafe?.user;
        const urlParams = new URLSearchParams(window.location.search);
        const phoneParam = urlParams.get('phone') || '';

        if (!userSnap.exists()) {
          const baseUsername = tgUserData?.username || phoneParam || `user_${currentUser.uid.slice(0, 5)}`;
          await setDoc(userRef, {
            uid: currentUser.uid,
            phoneNumber: phoneParam,
            telegramId: tgUserData?.id || '',
            firstName: tgUserData?.first_name || '',
            lastName: tgUserData?.last_name || '',
            username: baseUsername.toLowerCase(),
            balance: 1250000, // Initial gift balance
            createdAt: serverTimestamp(),
            accountType: 'cashback',
            setupComplete: true
          });
          
          // Add initial transaction
          const txRef = doc(collection(db, 'transactions'));
          await setDoc(txRef, {
            uid: currentUser.uid,
            title: 'Xush kelibsiz bonusi',
            subtitle: 'Ro\'yxatdan o\'tganingiz uchun',
            amount: 1250000,
            type: 'plus',
            date: serverTimestamp(),
            icon: 'gift'
          });
        } else if (!userSnap.data().username) {
          // Add username if missing
          const baseUsername = tgUserData?.username || phoneParam || `user_${currentUser.uid.slice(0, 5)}`;
          await updateDoc(userRef, {
            username: baseUsername.toLowerCase()
          });
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to balance
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      }
    }, (err) => handleFirestoreError(err, 'get', `users/${user.uid}`));

    // Listen to transactions
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid)
    );
    const unsubTx = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        rawDate: doc.data().date?.toDate() || new Date(),
        date: doc.data().date?.toDate()?.toLocaleString('uz-UZ', { 
          day: 'numeric', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        }) || 'Hozir'
      })).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setTransactions(txs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, 'list', 'transactions'));

    // Listen to notifications
    const notifQ = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid)
    );
    const unsubNotif = onSnapshot(notifQ, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        rawDate: doc.data().date?.toDate() || new Date()
      })).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setNotifications(notifs);
    }, (err) => handleFirestoreError(err, 'list', 'notifications'));

    return () => {
      unsubUser();
      unsubTx();
      unsubNotif();
    };
  }, [user]);

  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initDataUnsafe?.user) {
        setIsTMA(true);
        setTgUser(tg.initDataUnsafe.user);
        tg.expand();
        tg.ready();
        tg.headerColor = '#0a0a0a';
        tg.backgroundColor = '#0a0a0a';
      }
    } catch (e) {
      console.log("Not in Telegram");
    }
  }, []);

  const handleGoogleLogin = async () => {
    haptic();
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed:", error);
      showToast("Google orqali kirishda xatolik yuz berdi.");
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    haptic();
    setIsRefreshing(true);
    // Simulate network request to show animation
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload();
  };

  const haptic = () => {
    try {
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    } catch (e) {}
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const closeScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // silently ignore if already stopped or not running
      }
      try {
        scannerRef.current.clear();
      } catch (e) {}
    }
    setShowScanner(false);
  };

  const handleScanResult = async (decodedText: string) => {
    haptic();
    await closeScanner();
    
    if (decodedText.startsWith('cashback:')) {
      const amountStr = decodedText.split(':')[1];
      const amount = parseInt(amountStr) || 10000;
      
      try {
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            balance: (userSnap.data().balance || 0) + amount
          });
          
          const txRef = doc(collection(db, 'transactions'));
          await setDoc(txRef, {
            uid: auth.currentUser!.uid,
            title: 'Promo Keshbek',
            subtitle: 'QR kod skanerlandi',
            amount: amount,
            type: 'plus',
            date: serverTimestamp(),
            icon: 'gift'
          });
          
          showToast(`Tabriklaymiz! Sizga ${amount} UZS keshbek berildi!`);
        }
      } catch (e) {
        console.error(e);
        showToast("Keshbek olishda xatolik yuz berdi.");
      }
      return;
    }

    let targetUid = decodedText;
    if (decodedText.startsWith('user:')) {
      targetUid = decodedText.split(':')[1];
    }

    if (isMerchantMode) {
      // Merchant scanning a user QR
      const cashbackAmount = 5000; // Fixed for demo
      
      try {
        const recipientRef = doc(db, 'users', targetUid);
        const recipientSnap = await getDoc(recipientRef);
        
        if (recipientSnap.exists()) {
          await updateDoc(recipientRef, {
            balance: (recipientSnap.data().balance || 0) + cashbackAmount
          });
          
          // Add transaction for the user
          const txRef = doc(collection(db, 'transactions'));
          await setDoc(txRef, {
            uid: targetUid,
            title: 'Keshbek: Hamkor do\'kon',
            subtitle: 'QR kod orqali to\'lov',
            amount: cashbackAmount,
            type: 'plus',
            date: serverTimestamp(),
            icon: 'zap'
          });
          
          showToast(`Foydalanuvchiga ${cashbackAmount} UZS keshbek berildi!`);
        } else {
          showToast("Foydalanuvchi topilmadi!");
        }
      } catch (e) {
        console.error(e);
        showToast("Xatolik yuz berdi");
      }
    } else {
      // User scanning another user
      try {
        if (targetUid === auth.currentUser?.uid) {
          showToast("O'zingizga pul o'tkaza olmaysiz");
          return;
        }
        const userRef = doc(db, 'users', targetUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setTransferTarget({ uid: targetUid, ...userSnap.data() });
          setShowTransferModal(true);
        } else {
          showToast("Noma'lum QR kod: " + decodedText);
        }
      } catch (e) {
        showToast("QR kodni o'qishda xatolik");
      }
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'store': return <Store className="w-5 h-5" />;
      case 'zap': return <Zap className="w-5 h-5" />;
      case 'gift': return <Gift className="w-5 h-5" />;
      case 'send': return <ArrowUpRight className="w-5 h-5" />;
      default: return <ArrowUpRight className="w-5 h-5" />;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (scannerRef.current) {
        try {
          const decodedText = await scannerRef.current.scanFile(file, true);
          handleScanResult(decodedText);
        } catch (err) {
          console.error("Error scanning file", err);
          showToast("QR kodni o'qib bo'lmadi. Rasm aniq ekanligiga ishonch hosil qiling.");
        }
      }
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      showToast("Iltimos, to'g'ri summani kiriting");
      return;
    }
    const amount = Number(paymentAmount);
    if (balance < amount) {
      showToast("Hisobingizda mablag' yetarli emas");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: balance - amount
      });

      const txRef = doc(collection(db, 'transactions'));
      await setDoc(txRef, {
        uid: user.uid,
        title: `${paymentService.label} to'lovi`,
        subtitle: 'Ilova orqali to\'lov',
        amount: amount,
        type: 'minus',
        date: serverTimestamp(),
        icon: paymentService.iconName || 'zap'
      });

      showToast("To'lov muvaffaqiyatli amalga oshirildi!");
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentService(null);
    } catch (e) {
      console.error(e);
      showToast("To'lovda xatolik yuz berdi");
    }
  };

  const handleInitiateTransfer = () => {
    if (!transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) {
      showToast("Iltimos, to'g'ri summani kiriting");
      return;
    }
    const amount = Number(transferAmount);
    if (balance < amount) {
      showToast("Hisobingizda mablag' yetarli emas");
      return;
    }
    setShowTransferConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    const amount = Number(transferAmount);
    try {
      const senderRef = doc(db, 'users', user.uid);
      const receiverRef = doc(db, 'users', transferTarget.uid);

      await updateDoc(senderRef, {
        balance: balance - amount
      });

      const receiverSnap = await getDoc(receiverRef);
      if (receiverSnap.exists()) {
        await updateDoc(receiverRef, {
          balance: (receiverSnap.data().balance || 0) + amount
        });
      }

      // Sender transaction
      const senderTxRef = doc(collection(db, 'transactions'));
      await setDoc(senderTxRef, {
        uid: user.uid,
        title: `O'tkazma: ${transferTarget.firstName || transferTarget.username}`,
        subtitle: 'P2P O\'tkazma',
        amount: amount,
        type: 'minus',
        date: serverTimestamp(),
        icon: 'send'
      });

      // Receiver transaction
      const receiverTxRef = doc(collection(db, 'transactions'));
      await setDoc(receiverTxRef, {
        uid: transferTarget.uid,
        title: `Qabul qilindi: ${user.firstName || user.username || 'Foydalanuvchi'}`,
        subtitle: 'P2P O\'tkazma',
        amount: amount,
        type: 'plus',
        date: serverTimestamp(),
        icon: 'send'
      });

      showToast("O'tkazma muvaffaqiyatli amalga oshirildi!");
      setShowTransferConfirm(false);
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferTarget(null);
    } catch (e) {
      console.error(e);
      showToast("O'tkazmada xatolik yuz berdi");
    }
  };

  useEffect(() => {
    if (showScanner) {
      setCameraError(false);
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        (errorMessage) => {
          // ignore parse errors
        }
      ).catch((err) => {
        // Fallback to user camera if environment camera is not found
        html5QrCode.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleScanResult(decodedText);
          },
          (errorMessage) => {}
        ).catch((err2) => {
          setCameraError(true);
        });
      });
    }
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [showScanner]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Xayrli tong';
    if (hour < 18) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30 border-4 border-white"
          >
            <Zap className="w-12 h-12 text-white" />
          </motion.div>
          
          <div className="flex gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: ["0%", "-50%", "0%"],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
                className="w-3 h-3 bg-emerald-500 rounded-full"
              />
            ))}
          </div>
          <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Yuklanmoqda</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="w-24 h-24 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30 border-4 border-white"
          >
            <Zap className="w-12 h-12 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">Cashback<span className="text-emerald-500">.</span></h1>
            <p className="text-slate-500 mb-12 text-lg font-medium leading-relaxed">Sodiqlik dasturi va to'lovlar bir ilovada.</p>
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full space-y-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="w-full bg-white text-slate-900 font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              GOOGLE ORQALI KIRISH
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { haptic(); signInAnonymously(auth); }}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-slate-900/20 transition-all"
            >
              MEHMON SIFATIDA KIRISH
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans selection:bg-emerald-500/30 pb-28 overflow-x-hidden relative">
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-2xl z-40 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-[1.2rem] border-2 border-white p-0.5 bg-slate-100 shadow-sm relative"
          >
            <img 
              src={tgUser?.photo_url || `https://ui-avatars.com/api/?name=${tgUser?.first_name || 'User'}&background=10b981&color=fff`} 
              alt="Avatar" 
              className="w-full h-full object-cover rounded-xl"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
          </motion.div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">{getGreeting()}</p>
            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">{tgUser?.first_name || 'Foydalanuvchi'}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={handleRefresh}
            className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-500 transition-all flex items-center justify-center text-slate-400"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => { haptic(); setShowNotifications(true); }}
            className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-500 transition-all flex items-center justify-center text-slate-400 relative"
          >
            <Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => { haptic(); setShowSettings(true); }}
            className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-500 transition-all flex items-center justify-center text-slate-400"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      <main className="px-4 mt-4 space-y-6 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10 pb-32"
            >
              {/* Balance Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 group border border-white/10"
              >
                {/* Glassmorphism/Mesh Background */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 blur-[100px] -mr-20 -mt-20 group-hover:bg-emerald-500/30 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/20 blur-[100px] -ml-20 -mb-20 group-hover:bg-blue-500/30 transition-colors duration-700" />
                
                {/* Card Chip & Contactless Icon */}
                <div className="absolute top-8 right-8 flex flex-col items-end gap-3 opacity-60">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.06 19.43 4 16.05 4 12C4 7.95 7.06 4.57 11 4.07V19.93ZM13 4.07C16.94 4.57 20 7.95 20 12C20 16.05 16.94 19.43 13 19.93V4.07Z" fill="currentColor"/>
                  </svg>
                  <div className="w-10 h-8 rounded-md border border-white/40 flex items-center justify-center relative overflow-hidden bg-white/5">
                    <div className="absolute w-full h-[1px] bg-white/40 top-1/2 -translate-y-1/2" />
                    <div className="absolute w-[1px] h-full bg-white/40 left-1/3" />
                    <div className="absolute w-[1px] h-full bg-white/40 right-1/3" />
                  </div>
                </div>

                <div className="relative space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-50">Asosiy Balans</p>
                      </div>
                      <h2 className="text-4xl sm:text-5xl font-black tracking-tighter flex items-baseline gap-2 text-white drop-shadow-md">
                        {balance.toLocaleString()} 
                        <span className="text-xl sm:text-2xl font-bold text-white/70">UZS</span>
                      </h2>
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { haptic(); setShowMyQR(true); }}
                      className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white py-4 rounded-[1.5rem] font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/20 shadow-inner"
                    >
                      <QrCode className="w-5 h-5 opacity-90" />
                      QR KOD
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { haptic(); setPaymentService({ label: 'Hisobni to\'ldirish', iconName: 'zap' }); setShowPaymentModal(true); }}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-900 py-4 rounded-[1.5rem] font-black text-sm transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                      <ArrowDownLeft className="w-5 h-5" />
                      TO'LDIRISH
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions - Bento Grid Style */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tezkor amallar</h3>
                  <button onClick={() => setShowAllServices(true)} className="text-[11px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors">Barchasi</button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: <Smartphone className="w-7 h-7" />, label: 'Aloqa', color: 'bg-blue-50 text-blue-500 border-blue-100', iconName: 'zap' },
                    { icon: <ArrowUpRight className="w-7 h-7" />, label: 'O\'tkazma', color: 'bg-emerald-50 text-emerald-500 border-emerald-100', iconName: 'send', action: () => setShowScanner(true) },
                    { icon: <Globe className="w-7 h-7" />, label: 'Internet', color: 'bg-indigo-50 text-indigo-500 border-indigo-100', iconName: 'zap' },
                    { icon: <Zap className="w-7 h-7" />, label: 'Kommunal', color: 'bg-amber-50 text-amber-500 border-amber-100', iconName: 'zap' },
                  ].map((action, i) => (
                    <motion.button 
                      key={i}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { 
                        haptic(); 
                        if(action.action) {
                          action.action();
                        } else {
                          setPaymentService({ label: action.label, iconName: action.iconName }); 
                          setShowPaymentModal(true); 
                        }
                      }}
                      className="flex flex-col items-center gap-2.5 group"
                    >
                      <div className={`w-[76px] h-[76px] ${action.color} rounded-[2rem] flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all border bg-white`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.color.split(' ')[0]}`}>
                          {action.icon}
                        </div>
                      </div>
                      <p className="font-bold text-[11px] text-slate-600 tracking-tight text-center leading-tight">{action.label}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Special Offers Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Maxsus takliflar</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar px-2 -mx-2">
                  {specialOffers.map((offer) => (
                    <motion.div 
                      key={offer.id}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { haptic(); showToast(`${offer.partner} taklifi tez kunda!`); }}
                      className={`flex-shrink-0 w-64 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden cursor-pointer bg-gradient-to-br ${offer.color}`}
                    >
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-8 -mb-8" />
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[1.2rem] flex items-center justify-center text-2xl shadow-inner border border-white/30">
                            {offer.icon}
                          </div>
                          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-sm">{offer.tag}</span>
                          </div>
                        </div>
                        <h4 className="font-black text-xl tracking-tight mb-1 drop-shadow-sm">{offer.title}</h4>
                        <p className="text-white/90 text-xs font-medium leading-relaxed max-w-[90%]">{offer.description}</p>
                        <div className="mt-4 flex items-center gap-1.5 opacity-80">
                          <span className="text-[10px] font-bold uppercase tracking-widest">{offer.partner}</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Partners Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Hamkorlar</h3>
                  <button onClick={() => setShowAllPartners(true)} className="text-[11px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors">Barchasi</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar px-2 -mx-2">
                  {partners.map((partner) => (
                    <motion.div 
                      key={partner.id}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { haptic(); showToast(`${partner.name} tez kunda ishga tushadi!`); }}
                      className="flex-shrink-0 w-40 bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 ${partner.color} opacity-5 blur-xl -mr-8 -mt-8 group-hover:opacity-20 transition-opacity duration-500`} />
                      <div className={`w-14 h-14 ${partner.color} rounded-[1.2rem] flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-${partner.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                        {partner.icon}
                      </div>
                      <h4 className="font-black text-base text-slate-900 tracking-tight mb-1">{partner.name}</h4>
                      <div className="flex items-center gap-1.5 bg-emerald-50/50 w-fit px-2 py-1 rounded-lg border border-emerald-100/50">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-emerald-600 font-bold text-[10px] tracking-tight">{partner.cashback} keshbek</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions (Home) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">So'nggi amallar</h3>
                  <button onClick={() => setActiveTab('history')} className="text-[11px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors">Barchasi</button>
                </div>
                <div className="space-y-3">
                  {transactions.slice(0, 3).length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 text-center shadow-sm">
                      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Hozircha amallar yo'q</p>
                    </div>
                  ) : (
                    transactions.slice(0, 3).map((tx, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white border border-slate-100 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 border ${tx.type === 'plus' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                            {tx.type === 'plus' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="font-black text-base text-slate-900 tracking-tight">{tx.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{tx.date}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg tracking-tighter ${tx.type === 'plus' ? 'text-emerald-500' : 'text-slate-900'}`}>
                            {tx.type === 'plus' ? '+' : '-'}{tx.amount.toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-32"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tighter text-slate-900">Tarix</h2>
                <p className="text-slate-400 text-xs font-medium">Barcha moliyaviy amallar</p>
              </div>

              {/* Monthly Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8" />
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80 mb-1">Kirim</p>
                  <p className="font-black text-lg text-emerald-600 tracking-tight">
                    +{transactions.filter(t => t.type === 'plus').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} <span className="text-[10px]">UZS</span>
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl -mr-8 -mt-8" />
                  <div className="w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600/80 mb-1">Chiqim</p>
                  <p className="font-black text-lg text-rose-600 tracking-tight">
                    -{transactions.filter(t => t.type === 'minus').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} <span className="text-[10px]">UZS</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-inner border border-slate-100">
                      <HistoryIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Hozircha amallar yo'q</p>
                  </div>
                ) : (
                  transactions.map((tx, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white border border-slate-100 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 border ${tx.type === 'plus' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                          {tx.type === 'plus' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-black text-base text-slate-900 tracking-tight">{tx.title}</p>
                          {tx.subtitle && (
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{tx.subtitle}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{tx.date}</p>
                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Bajarildi</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-lg tracking-tighter ${tx.type === 'plus' ? 'text-emerald-500' : 'text-slate-900'}`}>
                          {tx.type === 'plus' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-0.5">UZS</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-32"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tighter text-slate-900">Profil</h2>
                <p className="text-slate-400 text-xs font-medium">Shaxsiy ma'lumotlar va sozlamalar</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-[2rem] border-4 border-emerald-500/10 p-1 mx-auto mb-4 shadow-xl shadow-emerald-500/10 relative z-10">
                    <img 
                      src={tgUser?.photo_url || `https://ui-avatars.com/api/?name=${tgUser?.first_name || 'User'}&background=10b981&color=fff`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-[1.5rem]"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg border-[3px] border-white z-20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{tgUser?.first_name || 'Foydalanuvchi'}</h2>
                <p className="text-slate-400 text-sm mt-0.5 font-medium">@{tgUser?.username || 'user'}</p>
                
                <div className="flex items-center justify-center gap-4 mt-6">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-emerald-600 font-black text-[9px] uppercase tracking-[0.2em]">Gold Member</p>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      navigator.clipboard.writeText(user.uid);
                      showToast("ID nusxalandi!");
                    }}
                    className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    <p className="text-slate-500 font-black text-[9px] uppercase tracking-[0.2em]">ID: {user.uid.substring(0, 6)}...</p>
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Merchant Mode Toggle */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { haptic(); setIsMerchantMode(!isMerchantMode); }}>
                    <div className="flex items-center gap-3.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${isMerchantMode ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-[17px] text-slate-900 tracking-tight">Sotuvchi rejimi</span>
                    </div>
                    <div className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-300 ease-in-out ${isMerchantMode ? 'bg-[#34C759]' : 'bg-[#E9E9EA]'}`}>
                      <div className={`w-[27px] h-[27px] bg-white rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out ${isMerchantMode ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>

                {/* Settings Group */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                  {[
                    { icon: <ShieldCheck className="w-5 h-5" />, label: 'Xavfsizlik', color: 'bg-[#5856D6]', action: () => setShowSecuritySettings(true) },
                    { icon: <Bell className="w-5 h-5" />, label: 'Bildirishnomalar', color: 'bg-[#007AFF]', action: () => setShowNotifications(true) },
                    { icon: <Settings className="w-5 h-5" />, label: 'Sozlamalar', color: 'bg-[#8E8E93]', action: () => setShowSettings(true) },
                    { icon: <HelpCircle className="w-5 h-5" />, label: 'Yordam', color: 'bg-[#34C759]', action: () => showToast('Yordam markazi tez kunda') },
                  ].map((item, i) => (
                    <div 
                      key={i}
                      onClick={() => { haptic(); item.action?.(); }}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center text-white`}>
                          {item.icon}
                        </div>
                        <span className="font-medium text-[17px] text-slate-900 tracking-tight">{item.label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#C7C7CC]" />
                    </div>
                  ))}
                </div>

                {/* Logout Button */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div 
                    onClick={() => { haptic(); auth.signOut(); }}
                    className="w-full p-4 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100"
                  >
                    <span className="font-medium text-[17px] text-[#FF3B30] tracking-tight">Tizimdan chiqish</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-[84px] pb-5 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 flex items-center justify-around px-2 z-50">
        {[
          { id: 'home', icon: <Wallet className="w-6 h-6" />, label: 'Asosiy' },
          { id: 'scan', icon: <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 -mt-6 border-4 border-white transition-transform hover:scale-105"><Scan className="w-6 h-6 text-white" /></div>, label: '' },
          { id: 'history', icon: <HistoryIcon className="w-6 h-6" />, label: 'Tarix' },
          { id: 'profile', icon: <UserIcon className="w-6 h-6" />, label: 'Profil' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => { haptic(); if(item.id === 'scan') setShowScanner(true); else setActiveTab(item.id); }}
            className={`flex flex-col items-center justify-center gap-1 transition-all w-16 h-full pt-2 ${activeTab === item.id ? 'text-emerald-500' : 'text-[#8E8E93] hover:text-slate-600'}`}
          >
            <div className={`transition-transform duration-300 ${activeTab === item.id && item.id !== 'scan' ? '-translate-y-0.5' : ''}`}>
              {item.icon}
            </div>
            {item.label && (
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Sozlamalar</h3>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(false)}
                className="p-3 bg-slate-100 rounded-2xl text-slate-400"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Foydalanuvchi nomi (Username)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                  <input 
                    type="text" 
                    placeholder="username"
                    defaultValue={user?.username || ''}
                    onBlur={async (e) => {
                      const newUsername = e.target.value.toLowerCase().trim();
                      if (newUsername.length >= 3 && newUsername !== user?.username) {
                        setLoading(true);
                        try {
                          // Check if username is taken
                          const q = query(collection(db, 'users'), where('username', '==', newUsername));
                          const snap = await getDocs(q);
                          if (!snap.empty) {
                            showToast("Ushbu username band!");
                          } else {
                            await updateDoc(doc(db, 'users', auth.currentUser!.uid), { username: newUsername });
                            showToast("Username yangilandi!");
                          }
                        } catch (e) {
                          console.error(e);
                        }
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] pl-10 pr-6 py-5 text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-4 italic">Boshqa foydalanuvchilar sizni shu nom orqali topishadi</p>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptic(); auth.signOut(); setShowSettings(false); }}
                  className="w-full bg-red-50 text-red-500 font-black py-5 rounded-[2rem] flex items-center justify-center gap-3"
                >
                  <LogOut className="w-5 h-5" />
                  TIZIMDAN CHIQISH
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {showSecuritySettings && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-[#F2F2F7] flex flex-col p-6"
          >
            <div className="flex items-center justify-between pt-4 pb-6">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Xavfsizlik</h3>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSecuritySettings(false)}
                className="p-3 bg-slate-200/50 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-24">
              {/* Two-Factor Authentication */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { haptic(); setIs2FAEnabled(!is2FAEnabled); showToast(is2FAEnabled ? '2FA o\'chirildi' : '2FA yoqildi'); }}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-[#5856D6]">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-medium text-[17px] text-slate-900 tracking-tight block">Ikki bosqichli tasdiqlash</span>
                    </div>
                  </div>
                  <div className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-300 ease-in-out ${is2FAEnabled ? 'bg-[#34C759]' : 'bg-[#E9E9EA]'}`}>
                    <div className={`w-[27px] h-[27px] bg-white rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out ${is2FAEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Linked Devices */}
              <div className="space-y-2">
                <h4 className="text-[13px] font-medium uppercase tracking-wide text-slate-500 ml-4">Ulangan qurilmalar</h4>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                  {linkedDevices.map((device) => (
                    <div key={device.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${device.current ? 'bg-[#34C759]' : 'bg-[#8E8E93]'}`}>
                          {device.type === 'mobile' ? <Smartphone className="w-5 h-5" /> : device.type === 'desktop' ? <Laptop className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[17px] text-slate-900 tracking-tight block">{device.name}</span>
                            {device.current && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-widest">Joriy</span>
                            )}
                          </div>
                          <span className="text-[13px] text-slate-500">{device.location} • {device.time}</span>
                        </div>
                      </div>
                      {!device.current && (
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            haptic();
                            setLinkedDevices(prev => prev.filter(d => d.id !== device.id));
                            showToast(`${device.name} dan chiqildi`);
                          }}
                          className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all"
                        >
                          <LogOut className="w-4 h-4 ml-0.5" />
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
                {linkedDevices.length > 1 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-4">
                    <div 
                      onClick={() => {
                        haptic();
                        setLinkedDevices(prev => prev.filter(d => d.current));
                        showToast('Barcha boshqa qurilmalardan chiqildi');
                      }}
                      className="w-full p-4 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100"
                    >
                      <span className="font-medium text-[17px] text-[#FF3B30] tracking-tight">Barcha boshqa qurilmalardan chiqish</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Bildirishnomalar</h3>
              <div className="flex gap-2">
                {notifications.some(n => !n.read) && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={async () => {
                      haptic();
                      const unreadNotifs = notifications.filter(n => !n.read);
                      for (const n of unreadNotifs) {
                        await updateDoc(doc(db, 'notifications', n.id), { read: true });
                      }
                    }}
                    className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100"
                  >
                    O'qilgan
                  </motion.button>
                )}
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNotifications(false)}
                  className="p-3 bg-slate-100 rounded-2xl text-slate-400"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold">Hozircha bildirishnomalar yo'q</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-5 rounded-3xl border transition-all ${n.read ? 'bg-white border-slate-100 opacity-60' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}
                    onClick={async () => {
                      if (!n.read) {
                        await updateDoc(doc(db, 'notifications', n.id), { read: true });
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${n.read ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {n.date?.toDate()?.toLocaleString('uz-UZ') || 'Hozir'}
                      </p>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">{n.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {showTransferModal && transferTarget && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] bg-white flex flex-col p-6"
          >
            <div className="flex justify-end pt-4 pb-8">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic(); setShowTransferModal(false); setTransferAmount(''); setTransferTarget(null); }}
                className="p-4 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors border border-slate-100"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
              <div className="w-24 h-24 rounded-[2.5rem] border-4 border-emerald-500/10 p-1 mx-auto mb-6 shadow-2xl shadow-emerald-500/20 relative">
                <img 
                  src={`https://ui-avatars.com/api/?name=${transferTarget.firstName || transferTarget.username || 'U'}&background=10b981&color=fff`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover rounded-[2rem]"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <h3 className="text-3xl font-black mb-1 tracking-tighter text-slate-900 text-center">
                {transferTarget.firstName || transferTarget.username || 'Foydalanuvchi'}
              </h3>
              <p className="text-slate-400 text-center mb-10 text-sm font-medium">@{transferTarget.username || 'user'}</p>
              
              <div className="w-full mb-8">
                <div className="relative">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 px-8 text-4xl font-black text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-center placeholder:text-slate-300"
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">UZS</span>
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mt-4 justify-center">
                  {[10000, 50000, 100000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => { haptic(); setTransferAmount(amount.toString()); }}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-sm font-bold transition-colors"
                    >
                      +{amount.toLocaleString('uz-UZ')}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptic(); handleInitiateTransfer(); }}
                disabled={!transferAmount || parseInt(transferAmount) <= 0}
                className="w-full bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/20 disabled:shadow-none mt-auto mb-8"
              >
                O'TKAZISH
              </motion.button>
            </div>
          </motion.div>
        )}

        {showTransferConfirm && transferTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#F2F2F7] rounded-t-[2rem] p-6 pb-10 w-full max-w-md mx-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">O'tkazmani tasdiqlash</h3>
                <button 
                  onClick={() => setShowTransferConfirm(false)}
                  className="w-8 h-8 bg-slate-200/50 rounded-full flex items-center justify-center text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${transferTarget.firstName || transferTarget.username || 'U'}&background=10b981&color=fff`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{transferTarget.firstName || transferTarget.username || 'Foydalanuvchi'}</p>
                    <p className="text-sm text-slate-500">@{transferTarget.username || 'user'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[15px]">O'tkazma summasi</span>
                    <span className="font-bold text-slate-900 text-[15px]">{Number(transferAmount).toLocaleString('uz-UZ')} UZS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[15px]">Komissiya (0%)</span>
                    <span className="font-bold text-slate-900 text-[15px]">0 UZS</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-900">Jami</span>
                    <span className="font-black text-emerald-500 text-lg">{Number(transferAmount).toLocaleString('uz-UZ')} UZS</span>
                  </div>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptic(); handleConfirmTransfer(); }}
                className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 text-[17px]"
              >
                Tasdiqlash
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {showPaymentModal && paymentService && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col p-6"
          >
            <div className="flex justify-end pt-4 pb-8">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic(); setShowPaymentModal(false); setPaymentAmount(''); setPaymentService(null); }}
                className="p-4 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors border border-slate-100"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
              <div className="w-24 h-24 bg-gradient-to-tr from-emerald-50 to-emerald-100 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10 border-4 border-white">
                <div className="scale-150">
                  {getIcon(paymentService.iconName)}
                </div>
              </div>
              
              <h3 className="text-3xl font-black mb-2 tracking-tighter text-slate-900 text-center">{paymentService.label}</h3>
              <p className="text-slate-400 text-center mb-10 text-sm font-medium">To'lov summasini kiriting</p>
              
              <div className="w-full mb-8">
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 px-8 text-4xl font-black text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-center placeholder:text-slate-300"
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">UZS</span>
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mt-4 justify-center">
                  {[10000, 50000, 100000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => { haptic(); setPaymentAmount(amount.toString()); }}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-sm font-bold transition-colors"
                    >
                      +{amount.toLocaleString('uz-UZ')}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptic(); handlePayment(); }}
                disabled={!paymentAmount || parseInt(paymentAmount) <= 0}
                className="w-full bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/20 disabled:shadow-none mt-auto mb-8"
              >
                TO'LASH
              </motion.button>
            </div>
          </motion.div>
        )}

        {showMyQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] shadow-2xl border border-white/20 mb-8 relative w-full max-w-sm"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 border-4 border-emerald-500/20">
                  <img 
                    src={tgUser?.photo_url || `https://ui-avatars.com/api/?name=${tgUser?.first_name || 'User'}&background=10b981&color=fff`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">{tgUser?.first_name || 'Foydalanuvchi'}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">ID: {user?.uid?.substring(0, 8)}</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] flex justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
                <QRCodeSVG 
                  value={`user:${auth.currentUser?.uid || 'demo'}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="#0f172a"
                />
              </div>
            </motion.div>
            
            <p className="text-white/60 text-center mb-10 max-w-[260px] text-sm leading-relaxed font-medium">Keshbek yig'ish yoki pul qabul qilish uchun ushbu kodni ko'rsating</p>
            
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => { haptic(); setShowMyQR(false); }}
              className="w-16 h-16 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10"
            >
              <X className="w-8 h-8" />
            </motion.button>
          </motion.div>
        )}

        {showScanner && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6"
          >
            <div className="absolute top-12 left-0 right-0 flex justify-center z-50">
              <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                <p className="text-xs font-black uppercase tracking-widest text-white">QR Skanerlash</p>
              </div>
            </div>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => { haptic(); closeScanner(); }}
              className="absolute top-10 right-8 p-4 bg-white/10 rounded-full text-white z-50 border border-white/10 backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </motion.button>
            
            <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border border-white/10 relative shadow-2xl">
              <div id="reader" className="w-full h-full" />
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900 z-10">
                  <div className="w-20 h-20 bg-red-500/20 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/30">
                    <Scan className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">Kameraga ruxsat yo'q</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                    Kameradan foydalanish uchun brauzer sozlamalaridan ruxsat bering yoki QR kod rasmini yuklang.
                  </p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] shadow-xl shadow-emerald-500/20"
                  >
                    RASMDAN O'QISH
                  </motion.button>
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 border-[40px] border-slate-950/80 pointer-events-none" />
                  <div className="absolute inset-[40px] border-2 border-emerald-500 rounded-[2rem] pointer-events-none shadow-[0_0_30px_rgba(16,185,129,0.3)]" />
                  <div className="absolute inset-[40px] border-2 border-emerald-400/50 rounded-[2rem] animate-pulse pointer-events-none" />
                  <div className="absolute top-1/2 left-[40px] right-[40px] h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-scan pointer-events-none" />
                </>
              )}
            </div>
            {!cameraError && (
              <>
                <p className="mt-12 text-emerald-400 font-bold tracking-widest uppercase text-[10px] animate-pulse">Kodni ramka ichiga joylashtiring</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-8 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-[2rem] border border-white/10 backdrop-blur-md flex items-center gap-3 transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                  Rasmdan o'qish
                </motion.button>
              </>
            )}
          </motion.div>
        )}
        {showAllPartners && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col p-6"
          >
            <div className="flex items-center justify-between pt-4 pb-6">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Barcha hamkorlar</h3>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAllPartners(false)}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors border border-slate-100"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-24">
              <div className="grid grid-cols-2 gap-4">
                {partners.map((partner) => (
                  <motion.div 
                    key={partner.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { haptic(); showToast(`${partner.name} tez kunda ishga tushadi!`); }}
                    className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 ${partner.color} opacity-5 blur-xl -mr-8 -mt-8 group-hover:opacity-20 transition-opacity duration-500`} />
                    <div className={`w-14 h-14 ${partner.color} rounded-[1.2rem] flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-${partner.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                      {partner.icon}
                    </div>
                    <h4 className="font-black text-base text-slate-900 tracking-tight mb-1">{partner.name}</h4>
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 w-fit px-2 py-1 rounded-lg border border-emerald-100/50">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-emerald-600 font-bold text-[10px] tracking-tight">{partner.cashback} keshbek</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {showAllServices && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col p-6"
          >
            <div className="flex items-center justify-between pt-4 pb-6">
              <h3 className="text-3xl font-black tracking-tighter text-slate-900">Barcha xizmatlar</h3>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAllServices(false)}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors border border-slate-100"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-24">
              {[
                {
                  title: 'Asosiy',
                  items: [
                    { icon: <Smartphone className="w-7 h-7" />, label: 'Aloqa', color: 'bg-blue-50 text-blue-500 border-blue-100', iconName: 'zap' },
                    { icon: <ArrowUpRight className="w-7 h-7" />, label: 'O\'tkazma', color: 'bg-emerald-50 text-emerald-500 border-emerald-100', iconName: 'send', action: () => setShowScanner(true) },
                    { icon: <Globe className="w-7 h-7" />, label: 'Internet', color: 'bg-indigo-50 text-indigo-500 border-indigo-100', iconName: 'zap' },
                    { icon: <Zap className="w-7 h-7" />, label: 'Kommunal', color: 'bg-amber-50 text-amber-500 border-amber-100', iconName: 'zap' },
                  ]
                },
                {
                  title: 'Davlat xizmatlari',
                  items: [
                    { icon: <ShieldCheck className="w-7 h-7" />, label: 'Soliqlar', color: 'bg-red-50 text-red-500 border-red-100', iconName: 'zap' },
                    { icon: <Car className="w-7 h-7" />, label: 'DYHXX', color: 'bg-slate-50 text-slate-500 border-slate-100', iconName: 'zap' },
                    { icon: <Building2 className="w-7 h-7" />, label: 'Kadastr', color: 'bg-teal-50 text-teal-500 border-teal-100', iconName: 'zap' },
                    { icon: <GraduationCap className="w-7 h-7" />, label: 'Ta\'lim', color: 'bg-sky-50 text-sky-500 border-sky-100', iconName: 'zap' },
                  ]
                },
                {
                  title: 'Boshqa',
                  items: [
                    { icon: <Gamepad2 className="w-7 h-7" />, label: 'O\'yinlar', color: 'bg-purple-50 text-purple-500 border-purple-100', iconName: 'zap' },
                    { icon: <Tv className="w-7 h-7" />, label: 'TV', color: 'bg-rose-50 text-rose-500 border-rose-100', iconName: 'zap' },
                    { icon: <HeartPulse className="w-7 h-7" />, label: 'Xayriya', color: 'bg-pink-50 text-pink-500 border-pink-100', iconName: 'zap' },
                    { icon: <Plane className="w-7 h-7" />, label: 'Chiptalar', color: 'bg-cyan-50 text-cyan-500 border-cyan-100', iconName: 'zap' },
                  ]
                }
              ].map((category, idx) => (
                <div key={idx} className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{category.title}</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {category.items.map((action, i) => (
                      <motion.button 
                        key={i}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { 
                          haptic(); 
                          if(action.action) {
                            action.action();
                          } else {
                            setPaymentService({ label: action.label, iconName: action.iconName }); 
                            setShowPaymentModal(true); 
                          }
                        }}
                        className="flex flex-col items-center gap-2.5 group"
                      >
                        <div className={`w-[76px] h-[76px] ${action.color} rounded-[2rem] flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all border bg-white`}>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.color.split(' ')[0]}`}>
                            {action.icon}
                          </div>
                        </div>
                        <p className="font-bold text-[11px] text-slate-600 tracking-tight text-center leading-tight">{action.label}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 60px; }
          100% { top: calc(100% - 60px); }
        }
        .animate-scan {
          animation: scan 2.5s ease-in-out infinite alternate;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
