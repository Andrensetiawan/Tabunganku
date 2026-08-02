"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Edit2,
  Moon,
  Sun,
  Wallet,
  TrendingUp,
  History,
  X,
  Save,
  PiggyBank,
  LayoutGrid,
  Search,
  Landmark,
  Building2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  ArrowRight,
  Delete,
} from "lucide-react";

type Category = {
  id: number;
  name: string;
  color: string;
  target: number;
};

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID || "1A1EyNWfj7BR8T3O-HOnRteTNvnnnIPGH4L0tdIEQx3E";
const CATEGORY_RANGE = "Categories!A2:D";
const TRANSACTION_RANGE = "Transactions!A2:F";
const SEABANK_TRANSACTION_RANGE = "Tabungan BNI!A2:E";
const BNI_TRANSACTION_RANGE = "Ikan!A2:E";
const CORRECT_PASSWORD = "060924";

type Transaction = {
  id: number;
  categoryId: number;
  amount: number;
  type: "in" | "out";
  date: string;
  description: string;
};

type BankTransaction = {
  id: number;
  amount: number;
  type: "in" | "out";
  date: string;
  description: string;
};

type TransactionFormState = {
  categoryId: number | "";
  amount: string;
  type: "in" | "out";
  description: string;
  date: string;
};

type CategoryFormState = {
  name: string;
  target: string;
};

const COLORS = ["bg-pink-500", "bg-indigo-500", "bg-yellow-500", "bg-teal-500", "bg-orange-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500"];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-700/60 transition-all ${className}`}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const base = "inline-flex items-center justify-center font-medium transition-colors rounded-xl focus:outline-none";

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20",
    secondary: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20",
    outline: "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400",
  };

  return (
    <button type={type} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [shake, setShake] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "seabank-history" | "bni-history">("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [txForm, setTxForm] = useState<TransactionFormState>({
    categoryId: categories[0]?.id ?? "",
    amount: "",
    type: "in",
    description: "",
    date: today,
  });

  const [catForm, setCatForm] = useState<CategoryFormState>({
    name: "",
    target: "",
  });

  // SeaBank Savings state (reads from sheet 'Tabungan BNI')
  const [seabankBalance, setSeabankBalance] = useState(0);
  const [isSeabankModalOpen, setIsSeabankModalOpen] = useState(false);
  const [editingSeabankTx, setEditingSeabankTx] = useState<BankTransaction | null>(null);
  const [seabankAmountInput, setSeabankAmountInput] = useState("");
  const [seabankTransactions, setSeabankTransactions] = useState<BankTransaction[]>([]);
  const [seabankSheetRange, setSeabankSheetRange] = useState("Tabungan BNI!A2:E");
  const [seabankForm, setSeabankForm] = useState({
    type: "in" as "in" | "out",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  // BNI Savings state (reads from sheet 'Ikan', displayed as Tabungan BNI)
  const [bniBalance, setBniBalance] = useState(0);
  const [isBniModalOpen, setIsBniModalOpen] = useState(false);
  const [editingBniTx, setEditingBniTx] = useState<BankTransaction | null>(null);
  const [bniAmountInput, setBniAmountInput] = useState("");
  const [bniTransactions, setBniTransactions] = useState<BankTransaction[]>([]);
  const [bniSheetRange, setBniSheetRange] = useState("Ikan!A2:E");
  const [bniForm, setBniForm] = useState({
    type: "in" as "in" | "out",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const authStatus = localStorage.getItem("tabunganku_auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      void loadFromSheets();
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (pwd: string) => {
    if (pwd === CORRECT_PASSWORD) {
      localStorage.setItem("tabunganku_auth", "true");
      setIsAuthenticated(true);
      setLoginError(false);
      void loadFromSheets();
    } else {
      setLoginError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tabunganku_auth");
    setIsAuthenticated(false);
    setPasswordInput("");
    setLoginError(false);
  };

  const handleNumpadClick = (val: string) => {
    if (passwordInput.length < 10) {
      const nextPwd = passwordInput + val;
      setPasswordInput(nextPwd);
      setLoginError(false);
      if (nextPwd.length === 6) {
        handleLogin(nextPwd);
      }
    }
  };

  const handleNumpadDelete = () => {
    setPasswordInput((prev) => prev.slice(0, -1));
    setLoginError(false);
  };

  const toNumber = (value: string | number | undefined, fallback = 0) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    const cleaned = typeof value === "string" ? value.replace(/[^\d.-]/g, "") : "";
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : fallback;
  };

  const fetchValues = async (range: string) => {
    if (!SHEET_ID) return [];
    try {
      const res = await fetch(`/api/sheets?sheetId=${SHEET_ID}&range=${encodeURIComponent(range)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.values as string[][]) || [];
    } catch {
      return [];
    }
  };

  const writeValues = async (range: string, values: (string | number)[][]) => {
    if (!SHEET_ID) return;
    await fetch("/api/sheets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetId: SHEET_ID, range, values }),
    });
  };

  const parseCategories = (rows: string[][]): Category[] => {
    const used = new Set<number>();
    const parsed: Category[] = [];
    rows.forEach((row, index) => {
      let id = toNumber(row[0], index + 1);
      if (id < 1) id = index + 1;
      while (used.has(id)) id += 1;
      used.add(id);
      const name = row[1]?.trim() || "Tanpa Nama";
      const color = row[2]?.trim() || COLORS[parsed.length % COLORS.length];
      const target = toNumber(row[3], 0);
      parsed.push({ id, name, color, target });
    });
    return parsed;
  };

  const parseTransactions = (rows: string[][], validCategoryIds: Set<number>): Transaction[] => {
    const used = new Set<number>();
    const parsed: Transaction[] = [];
    rows.forEach((row, index) => {
      let id = toNumber(row[0], index + 1);
      if (id < 1) id = index + 1;
      while (used.has(id)) id += 1;
      used.add(id);
      const categoryId = toNumber(row[1], 0);
      if (!validCategoryIds.has(categoryId)) return;
      const amount = toNumber(row[2], 0);
      const type = row[3] === "out" ? "out" : "in";
      const date = row[4] || today;
      const description = row[5]?.trim() || "";
      parsed.push({ id, categoryId, amount, type, date, description });
    });
    return parsed;
  };

  const saveCategories = async (data: Category[]) => {
    const rows = data.map((cat) => [cat.id, cat.name, cat.color, cat.target]);
    await writeValues(CATEGORY_RANGE, rows);
  };

  const saveTransactions = async (data: Transaction[]) => {
    const rows = data.map((tx) => [tx.id, tx.categoryId, tx.amount, tx.type, tx.date, tx.description]);
    await writeValues(TRANSACTION_RANGE, rows);
  };

  const parseBankTransactions = (rows: string[][]): BankTransaction[] => {
    const used = new Set<number>();
    const parsed: BankTransaction[] = [];
    rows.forEach((row, index) => {
      let id = toNumber(row[0], index + 1);
      if (id < 1) id = index + 1;
      while (used.has(id)) id += 1;
      used.add(id);
      const amount = toNumber(row[1], 0);
      const type = row[2] === "out" ? "out" : "in";
      const date = row[3] || today;
      const description = row[4]?.trim() || "";
      parsed.push({ id, amount, type, date, description });
    });
    return parsed;
  };

  const saveSeabankTransactions = async (data: BankTransaction[]) => {
    const rows = data.map((tx) => [tx.id, tx.amount, tx.type, tx.date, tx.description]);
    await writeValues(seabankSheetRange || SEABANK_TRANSACTION_RANGE, rows);
  };

  const saveBniTransactions = async (data: BankTransaction[]) => {
    const rows = data.map((tx) => [tx.id, tx.amount, tx.type, tx.date, tx.description]);
    await writeValues(bniSheetRange || BNI_TRANSACTION_RANGE, rows);
  };

  const loadFromSheets = async () => {
    const fetchSeabankData = async (): Promise<{ rows: string[][]; range: string }> => {
      const bniRows = await fetchValues("Tabungan BNI!A2:E1000");
      if (bniRows.length > 0) {
        return { rows: bniRows, range: "Tabungan BNI!A2:E" };
      }
      const tabunganSeaBankRows = await fetchValues("Tabungan SeaBank!A2:E1000");
      if (tabunganSeaBankRows.length > 0) {
        return { rows: tabunganSeaBankRows, range: "Tabungan SeaBank!A2:E" };
      }
      const tabunganSeabankRows = await fetchValues("Tabungan Seabank!A2:E1000");
      if (tabunganSeabankRows.length > 0) {
        return { rows: tabunganSeabankRows, range: "Tabungan Seabank!A2:E" };
      }
      const seabankRows = await fetchValues("Seabank!A2:E1000");
      if (seabankRows.length > 0) {
        return { rows: seabankRows, range: "Seabank!A2:E" };
      }
      return { rows: [], range: "Tabungan BNI!A2:E" };
    };

    const fetchBniData = async (): Promise<{ rows: string[][]; range: string }> => {
      const ikanRows = await fetchValues("Ikan!A2:E1000");
      if (ikanRows.length > 0) {
        return { rows: ikanRows, range: "Ikan!A2:E" };
      }
      return { rows: [], range: "Ikan!A2:E" };
    };

    const [catRows, txRows, seabankResult, bniResult] = await Promise.all([
      fetchValues("Categories!A2:D1000"),
      fetchValues("Transactions!A2:F1000"),
      fetchSeabankData(),
      fetchBniData(),
    ]);

    const parsedCategories = parseCategories(catRows);
    const validCategoryIds = new Set(parsedCategories.map((cat) => cat.id));
    const parsedTransactions = parseTransactions(txRows, validCategoryIds);
    const parsedSeabankTransactions = parseBankTransactions(seabankResult.rows);
    const parsedBniTransactions = parseBankTransactions(bniResult.rows);
    
    setCategories(parsedCategories);
    setTransactions(parsedTransactions);
    setSeabankTransactions(parsedSeabankTransactions);
    setSeabankSheetRange(seabankResult.range);
    setBniTransactions(parsedBniTransactions);
    setBniSheetRange(bniResult.range);
    
    // Calculate SeaBank balance from transactions (from Tabungan BNI sheet)
    const seabankBal = parsedSeabankTransactions.reduce((acc, tx) => {
      return acc + (tx.type === "in" ? tx.amount : -tx.amount);
    }, 0);
    setSeabankBalance(seabankBal);

    // Calculate BNI balance from transactions (from Ikan sheet)
    const bniBal = parsedBniTransactions.reduce((acc, tx) => {
      return acc + (tx.type === "in" ? tx.amount : -tx.amount);
    }, 0);
    setBniBalance(bniBal);
    
    const firstCategoryId = parsedCategories[0]?.id ?? "";
    setTxForm((prev) => ({ ...prev, categoryId: firstCategoryId }));
  };

  const getNextCategoryId = () => {
    const used = new Set(categories.map((cat) => cat.id));
    let next = 1;
    while (used.has(next)) {
      next += 1;
    }
    return next;
  };

  const getNextTransactionId = () => {
    const used = new Set(transactions.map((tx) => tx.id));
    let next = 1;
    while (used.has(next)) {
      next += 1;
    }
    return next;
  };

  const categoryBalances = useMemo(() => {
    const balances: Record<number, number> = {};
    categories.forEach((cat) => {
      balances[cat.id] = 0;
    });

    transactions.forEach((tx) => {
      if (balances[tx.categoryId] !== undefined) {
        balances[tx.categoryId] += tx.type === "in" ? Number(tx.amount) : -Number(tx.amount);
      }
    });

    return balances;
  }, [categories, transactions]);

  const totalBalance = useMemo(
    () => Object.values(categoryBalances).reduce((acc, curr) => acc + curr, 0),
    [categoryBalances]
  );

  const handleSaveTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!txForm.categoryId || !txForm.amount) return;

    const amountValue = Number(txForm.amount);

    if (editingTx) {
      setTransactions((prev) => {
        const updated = prev.map((tx) =>
          tx.id === editingTx.id
            ? {
                ...tx,
                ...txForm,
                id: editingTx.id,
                categoryId: Number(txForm.categoryId),
                amount: amountValue,
              }
            : tx
        );
        void saveTransactions(updated);
        return updated;
      });
      setEditingTx(null);
    } else {
      const newTx: Transaction = {
        ...txForm,
        id: getNextTransactionId(),
        categoryId: Number(txForm.categoryId),
        amount: amountValue,
      };
      setTransactions((prev) => {
        const updated = [newTx, ...prev];
        void saveTransactions(updated);
        return updated;
      });
    }

    closeTxModal();
  };

  const handleDeleteTransaction = (id: number) => {
    if (window.confirm("Yakin ingin menghapus transaksi ini?")) {
      setTransactions((prev) => {
        const updated = prev.filter((tx) => tx.id !== id);
        void saveTransactions(updated);
        return updated;
      });
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTxForm({
      categoryId: tx.categoryId,
      amount: tx.amount.toString(),
      type: tx.type,
      description: tx.description,
      date: tx.date,
    });
    setIsTxModalOpen(true);
  };

  const handleSaveCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catForm.name) return;

    if (editingCat) {
      setCategories((prev) => {
        const updated = prev.map((cat) =>
          cat.id === editingCat.id
            ? { ...cat, name: catForm.name, target: catForm.target ? Number(catForm.target) : 0 }
            : cat
        );
        void saveCategories(updated);
        return updated;
      });
      setEditingCat(null);
    } else {
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      const newCat: Category = {
        id: getNextCategoryId(),
        name: catForm.name,
        color: randomColor,
        target: catForm.target ? Number(catForm.target) : 0,
      };
      setCategories((prev) => {
        const updated = [...prev, newCat];
        void saveCategories(updated);
        return updated;
      });
    }

    closeCatModal();
  };

  const handleDeleteCategory = (id: number) => {
    if (window.confirm("Yakin ingin menghapus pos tabungan ini? Transaksi terkait juga akan dihapus.")) {
      setCategories((prev) => {
        const updated = prev.filter((cat) => cat.id !== id);
        void saveCategories(updated);
        return updated;
      });
      setTransactions((prev) => {
        const updated = prev.filter((tx) => tx.categoryId !== id);
        void saveTransactions(updated);
        return updated;
      });
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      target: cat.target ? cat.target.toString() : "",
    });
    setIsCatModalOpen(true);
  };

  const openTxModal = (catId?: number, type: "in" | "out" = "in") => {
    setEditingTx(null);
    setTxForm({
      categoryId: catId || categories[0]?.id || "",
      amount: "",
      type: type,
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsTxModalOpen(true);
  };

  const closeTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  const openCatModal = () => {
    setEditingCat(null);
    setCatForm({ name: "", target: "" });
    setIsCatModalOpen(true);
  };

  const closeCatModal = () => {
    setIsCatModalOpen(false);
    setEditingCat(null);
  };

  // SeaBank handlers
  const openSeabankModal = () => {
    setEditingSeabankTx(null);
    setSeabankAmountInput("");
    setSeabankForm({
      type: "in",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsSeabankModalOpen(true);
  };

  const handleEditSeabankTransaction = (tx: BankTransaction) => {
    setEditingSeabankTx(tx);
    setSeabankAmountInput(tx.amount.toString());
    setSeabankForm({
      type: tx.type,
      description: tx.description,
      date: tx.date,
    });
    setIsSeabankModalOpen(true);
  };

  const handleSaveSeabankTransaction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(seabankAmountInput.replace(/\D/g, ""));
    if (amount <= 0) return;

    if (editingSeabankTx) {
      const updated = seabankTransactions.map((t) =>
        t.id === editingSeabankTx.id
          ? {
              ...t,
              amount,
              type: seabankForm.type,
              description: seabankForm.description,
              date: seabankForm.date,
            }
          : t
      );
      setSeabankTransactions(updated);
      const newBalance = updated.reduce((acc, tx) => acc + (tx.type === "in" ? tx.amount : -tx.amount), 0);
      setSeabankBalance(newBalance);
      void saveSeabankTransactions(updated);
      setEditingSeabankTx(null);
    } else {
      const newTx: BankTransaction = {
        id: Date.now(),
        amount,
        type: seabankForm.type,
        description: seabankForm.description,
        date: seabankForm.date,
      };
      const updated = [newTx, ...seabankTransactions];
      setSeabankTransactions(updated);
      const newBalance = updated.reduce((acc, tx) => acc + (tx.type === "in" ? tx.amount : -tx.amount), 0);
      setSeabankBalance(newBalance);
      void saveSeabankTransactions(updated);
    }
    setIsSeabankModalOpen(false);
    setSeabankAmountInput("");
    setSeabankForm({ type: "in", description: "", date: new Date().toISOString().split("T")[0] });
  };

  // BNI handlers
  const openBniModal = () => {
    setEditingBniTx(null);
    setBniAmountInput("");
    setBniForm({
      type: "in",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsBniModalOpen(true);
  };

  const handleEditBniTransaction = (tx: BankTransaction) => {
    setEditingBniTx(tx);
    setBniAmountInput(tx.amount.toString());
    setBniForm({
      type: tx.type,
      description: tx.description,
      date: tx.date,
    });
    setIsBniModalOpen(true);
  };

  const handleSaveBniTransaction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(bniAmountInput.replace(/\D/g, ""));
    if (amount <= 0) return;

    if (editingBniTx) {
      const updated = bniTransactions.map((t) =>
        t.id === editingBniTx.id
          ? {
              ...t,
              amount,
              type: bniForm.type,
              description: bniForm.description,
              date: bniForm.date,
            }
          : t
      );
      setBniTransactions(updated);
      const newBalance = updated.reduce((acc, tx) => acc + (tx.type === "in" ? tx.amount : -tx.amount), 0);
      setBniBalance(newBalance);
      void saveBniTransactions(updated);
      setEditingBniTx(null);
    } else {
      const newTx: BankTransaction = {
        id: Date.now(),
        amount,
        type: bniForm.type,
        description: bniForm.description,
        date: bniForm.date,
      };
      const updated = [newTx, ...bniTransactions];
      setBniTransactions(updated);
      const newBalance = updated.reduce((acc, tx) => acc + (tx.type === "in" ? tx.amount : -tx.amount), 0);
      setBniBalance(newBalance);
      void saveBniTransactions(updated);
    }
    setIsBniModalOpen(false);
    setBniAmountInput("");
    setBniForm({ type: "in", description: "", date: new Date().toISOString().split("T")[0] });
  };

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name || "Dihapus";
  const getCategoryColor = (id: number) => categories.find((c) => c.id === id)?.color || "bg-gray-400";

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id
      ),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return sortedTransactions;
    const lowerQuery = searchQuery.toLowerCase();
    return sortedTransactions.filter(
      (tx) =>
        tx.description.toLowerCase().includes(lowerQuery) ||
        getCategoryName(tx.categoryId).toLowerCase().includes(lowerQuery) ||
        formatRupiah(tx.amount).toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, sortedTransactions, categories]);

  // Loading state while checking localStorage
  if (isAuthenticated === null) {
    return (
      <div className={`min-h-screen ${darkMode ? "dark bg-slate-900" : "bg-slate-50"} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className={`${darkMode ? "dark" : ""} transition-colors duration-300 w-full min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100 relative overflow-hidden font-sans`}>
        {/* Animated ambient background lights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar controls */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors backdrop-blur-md"
            title="Ganti Tema"
          >
            {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-slate-300" />}
          </button>
        </div>

        {/* Main Login Card */}
        <div className={`w-full max-w-md bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-slate-700/70 shadow-2xl relative z-10 ${shake ? "animate-bounce" : "animate-in fade-in zoom-in-95 duration-300"}`}>
          
          {/* Logo & Lock Badge */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 border-2 border-slate-800 text-blue-400">
                <Lock size={16} />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              TabunganKu
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-1.5">
              <KeyRound size={14} className="text-blue-400" /> Masukkan Password untuk Membuka
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(passwordInput);
            }}
            className="space-y-5"
          >
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  required
                  placeholder="Ketik password..."
                  value={passwordInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasswordInput(val);
                    setLoginError(false);
                    if (val.length === 6) {
                      handleLogin(val);
                    }
                  }}
                  className={`w-full py-3.5 px-4 pr-12 rounded-2xl bg-slate-900/90 border text-center text-xl tracking-widest font-mono text-white placeholder-slate-500 focus:outline-none transition-all ${
                    loginError
                      ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                      : "border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {loginError && (
                <p className="text-red-400 text-xs text-center mt-2 font-medium flex items-center justify-center gap-1 animate-pulse">
                  <X size={14} /> Password salah! Silakan coba lagi.
                </p>
              )}
            </div>

            {/* Quick PIN indicator dots (6 digits) */}
            <div className="flex justify-center items-center gap-2.5 py-1">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = passwordInput.length > index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      isFilled
                        ? "bg-blue-500 scale-110 shadow-md shadow-blue-500/50"
                        : "bg-slate-700/80 border border-slate-600"
                    }`}
                  />
                );
              })}
            </div>

            {/* On-screen Numpad */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadClick(num)}
                  className="py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-700/70 active:bg-blue-600/50 border border-slate-700/50 text-xl font-bold font-mono text-slate-100 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPasswordInput("")}
                className="py-3.5 rounded-2xl bg-slate-900/40 hover:bg-red-500/20 active:bg-red-500/30 border border-slate-700/40 text-xs font-semibold text-slate-400 hover:text-red-400 transition-all active:scale-95 flex items-center justify-center"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handleNumpadClick("0")}
                className="py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-700/70 active:bg-blue-600/50 border border-slate-700/50 text-xl font-bold font-mono text-slate-100 transition-all shadow-sm active:scale-95 flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleNumpadDelete}
                className="py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-700/70 active:bg-slate-600/50 border border-slate-700/50 text-slate-300 transition-all shadow-sm active:scale-95 flex items-center justify-center"
              >
                <Delete size={20} />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Unlock size={18} /> Masuk ke Aplikasi
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-green-500" /> Akses Terenkripsi & Aman
            </p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD (AUTHENTICATED)
  return (
    <div className={`${darkMode ? "dark" : ""} transition-colors duration-300 w-full overflow-x-hidden`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-20 md:pb-10 font-sans w-full overflow-x-hidden">
        <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 px-4 py-3 shadow-sm">
          <div className="max-w-3xl lg:max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
                <Wallet size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight shrink-0">TabunganKu</h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-36 sm:w-48 group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Cari..."
                  onClick={() => setIsSearchModalOpen(true)}
                  readOnly
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-all focus:outline-none shadow-sm"
                />
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                title="Ganti Tema"
              >
                {darkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-slate-600" />}
              </button>

              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors shrink-0"
                title="Kunci Aplikasi / Keluar"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl lg:max-w-4xl mx-auto p-4 space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Total Semua Tabungan */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <PiggyBank size={100} />
              </div>
              <p className="text-blue-100 font-medium mb-1">Total Semua Tabungan</p>
              <h2 className="text-3xl md:text-4xl font-bold">{formatRupiah(totalBalance)}</h2>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => openTxModal()}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-all"
                >
                  <Plus size={16} /> Tambah Saldo
                </button>
              </div>
            </div>

            {/* Card 2: TABUNGAN SEABANK */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Landmark size={100} />
              </div>
              <p className="text-orange-100 font-medium mb-1">TABUNGAN SEABANK</p>
              <h2 className="text-3xl md:text-4xl font-bold">{formatRupiah(seabankBalance)}</h2>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={openSeabankModal}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-all"
                >
                  <Plus size={16} /> Tambah Saldo
                </button>
              </div>
            </div>

            {/* Card 3: TABUNGAN BNI */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Building2 size={100} />
              </div>
              <p className="text-teal-100 font-medium mb-1">TABUNGAN BNI</p>
              <h2 className="text-3xl md:text-4xl font-bold">{formatRupiah(bniBalance)}</h2>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={openBniModal}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-all"
                >
                  <Plus size={16} /> Tambah Saldo
                </button>
              </div>
            </div>
          </section>

          <Card className="flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <TrendingUp size={18} /> Progres Tabungan
              </h3>
            </div>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat) => {
                const bal = categoryBalances[cat.id] || 0;
                const percent = totalBalance > 0 ? (bal / totalBalance) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate max-w-[120px]">{cat.name}</span>
                      <span className="font-mono">{Math.round(percent)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`${cat.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-0 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`pb-2 px-3 sm:px-4 font-medium text-sm transition-colors relative shrink-0 whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid size={16} /> Kategori
              </span>
              {activeTab === "dashboard" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`pb-2 px-3 sm:px-4 font-medium text-sm transition-colors relative shrink-0 whitespace-nowrap ${
                activeTab === "history"
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <History size={16} /> Riwayat Transaksi
              </span>
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("seabank-history")}
              className={`pb-2 px-3 sm:px-4 font-medium text-sm transition-colors relative shrink-0 whitespace-nowrap ${
                activeTab === "seabank-history"
                  ? "text-orange-600 dark:text-orange-400 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <Landmark size={16} /> Riwayat SeaBank
              </span>
              {activeTab === "seabank-history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 dark:bg-orange-400 rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("bni-history")}
              className={`pb-2 px-3 sm:px-4 font-medium text-sm transition-colors relative shrink-0 whitespace-nowrap ${
                activeTab === "bni-history"
                  ? "text-teal-600 dark:text-teal-400 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} /> Riwayat BNI
              </span>
              {activeTab === "bni-history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 dark:bg-teal-400 rounded-t-full" />
              )}
            </button>
          </div>

          {/* TAB 1: KATEGORI DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const balance = categoryBalances[cat.id] || 0;
                  const target = cat.target || 0;
                  const progress = target > 0 ? Math.min((balance / target) * 100, 100) : 0;

                  return (
                    <Card key={cat.id} className="relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-2 h-full ${cat.color}`} />
                      <div className="pl-2">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-lg">{cat.name}</h4>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              className="p-1 text-slate-400 hover:text-blue-500 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-2xl font-bold font-mono">{formatRupiah(balance)}</p>
                          {target > 0 && (
                            <p className="text-xs text-slate-500">
                              Target: {formatRupiah(target)} ({Math.round(progress)}%)
                            </p>
                          )}
                        </div>

                        {target > 0 && (
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-4">
                            <div
                              className={`${cat.color} h-1.5 rounded-full transition-all duration-300`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => openTxModal(cat.id, "in")}
                          >
                            <Plus size={14} /> Nabung
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => openTxModal(cat.id, "out")}
                          >
                            <Minus size={14} /> Tarik
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                <button
                  onClick={openCatModal}
                  className="h-full min-h-[160px] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all gap-2 group"
                >
                  <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
                    <Plus size={24} />
                  </div>
                  <span className="font-medium text-sm">Tambah Kategori Tabungan</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT TRANSAKSI KATEGORI */}
          {activeTab === "history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-lg">Semua Transaksi</h3>
                </div>

                {sortedTransactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Belum ada riwayat transaksi.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-start gap-4 mb-2 sm:mb-0">
                          <div
                            className={`p-2 rounded-full ${
                              tx.type === "in"
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "in" ? <Plus size={18} /> : <Minus size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {tx.description || "Tanpa Keterangan"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className={`px-2 py-0.5 rounded-md ${getCategoryColor(tx.categoryId)} text-white bg-opacity-80`}>
                                {getCategoryName(tx.categoryId)}
                              </span>
                              <span>• {tx.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                          <span
                            className={`font-bold font-mono ${
                              tx.type === "in" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "in" ? "+" : "-"} {formatRupiah(tx.amount)}
                          </span>
                          <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditTransaction(tx)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: RIWAYAT TABUNGAN SEABANK */}
          {activeTab === "seabank-history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-orange-200 dark:border-orange-900/50">
                <div className="mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                    <Landmark size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Riwayat TABUNGAN SEABANK</h3>
                </div>

                {seabankTransactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Belum ada transaksi TABUNGAN SEABANK tercatat.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...seabankTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-start gap-4 mb-2 sm:mb-0">
                          <div
                            className={`p-2 rounded-full ${
                              tx.type === "in"
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "in" ? <Plus size={18} /> : <Minus size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {tx.description || "Tanpa Keterangan"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white bg-opacity-80">
                                TABUNGAN SEABANK
                              </span>
                              <span>• {tx.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                          <span
                            className={`font-bold font-mono ${
                              tx.type === "in" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "in" ? "+" : "-"} {formatRupiah(tx.amount)}
                          </span>
                          <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditSeabankTransaction(tx)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Yakin ingin menghapus transaksi SeaBank ini?")) {
                                  const updated = seabankTransactions.filter((t) => t.id !== tx.id);
                                  setSeabankTransactions(updated);
                                  const newBalance = updated.reduce((acc, t) => acc + (t.type === "in" ? t.amount : -t.amount), 0);
                                  setSeabankBalance(newBalance);
                                  void saveSeabankTransactions(updated);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 4: RIWAYAT TABUNGAN BNI */}
          {activeTab === "bni-history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-teal-200 dark:border-teal-900/50">
                <div className="mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <Building2 size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Riwayat TABUNGAN BNI</h3>
                </div>

                {bniTransactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Belum ada transaksi TABUNGAN BNI tercatat.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...bniTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-start gap-4 mb-2 sm:mb-0">
                          <div
                            className={`p-2 rounded-full ${
                              tx.type === "in"
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "in" ? <Plus size={18} /> : <Minus size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {tx.description || "Tanpa Keterangan"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white bg-opacity-80">
                                TABUNGAN BNI
                              </span>
                              <span>• {tx.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                          <span
                            className={`font-bold font-mono ${
                              tx.type === "in" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "in" ? "+" : "-"} {formatRupiah(tx.amount)}
                          </span>
                          <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditBniTransaction(tx)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Yakin ingin menghapus transaksi BNI ini?")) {
                                  const updated = bniTransactions.filter((t) => t.id !== tx.id);
                                  setBniTransactions(updated);
                                  const newBalance = updated.reduce((acc, t) => acc + (t.type === "in" ? t.amount : -t.amount), 0);
                                  setBniBalance(newBalance);
                                  void saveBniTransactions(updated);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>

        {/* MODAL 1: TRANSAKSI KATEGORI */}
        {isTxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-lg">{editingTx ? "Edit Transaksi" : "Transaksi Baru"}</h3>
                <button onClick={closeTxModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: "in" })}
                    className={`py-2 rounded-md text-sm font-medium transition-all ${
                      txForm.type === "in"
                        ? "bg-white dark:bg-slate-600 shadow text-green-600 dark:text-green-400"
                        : "text-slate-500"
                    }`}
                  >
                    Pemasukan (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: "out" })}
                    className={`py-2 rounded-md text-sm font-medium transition-all ${
                      txForm.type === "out"
                        ? "bg-white dark:bg-slate-600 shadow text-red-600 dark:text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    Pengeluaran (-)
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pos Tabungan</label>
                  <select
                    value={txForm.categoryId}
                    onChange={(e) => setTxForm({ ...txForm, categoryId: Number(e.target.value) })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jumlah Saldo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold text-lg">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      required
                      placeholder="0"
                      value={txForm.amount ? new Intl.NumberFormat("id-ID").format(Number(txForm.amount)) : ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setTxForm({ ...txForm, amount: val });
                      }}
                      className="w-full pl-9 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Gaji Bulanan"
                      value={txForm.description}
                      onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={txForm.date}
                      onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                      className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button variant="outline" onClick={closeTxModal} className="flex-1">
                    Batal
                  </Button>
                  <Button variant="primary" type="submit" className="flex-1">
                    <Save size={18} /> Simpan
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: SEABANK MODAL */}
        {isSeabankModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-500 to-orange-600 flex justify-between items-center">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Landmark size={20} /> {editingSeabankTx ? "Edit Transaksi TABUNGAN SEABANK" : "Tambah Saldo TABUNGAN SEABANK"}
                </h3>
                <button
                  onClick={() => {
                    setIsSeabankModalOpen(false);
                    setEditingSeabankTx(null);
                  }}
                  className="text-white/80 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSeabankTransaction} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSeabankForm({ ...seabankForm, type: "in" })}
                    className={`py-2 rounded-md text-sm font-medium transition-all ${
                      seabankForm.type === "in"
                        ? "bg-white dark:bg-slate-600 shadow text-green-600 dark:text-green-400"
                        : "text-slate-500"
                    }`}
                  >
                    Pemasukan (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeabankForm({ ...seabankForm, type: "out" })}
                    className={`py-2 rounded-md text-sm font-medium transition-all ${
                      seabankForm.type === "out"
                        ? "bg-white dark:bg-slate-600 shadow text-red-600 dark:text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    Pengeluaran (-)
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jumlah Saldo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold text-lg">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      required
                      placeholder="0"
                      value={seabankAmountInput ? new Intl.NumberFormat("id-ID").format(Number(seabankAmountInput.replace(/\D/g, ""))) : ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setSeabankAmountInput(val);
                      }}
                      className="w-full pl-9 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gaji Bulanan / Transfer SeaBank"
                    value={seabankForm.description}
                    onChange={(e) => setSeabankForm({ ...seabankForm, description: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={seabankForm.date}
                    onChange={(e) => setSeabankForm({ ...seabankForm, date: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSeabankModalOpen(false);
                      setEditingSeabankTx(null);
                    }}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button variant="primary" type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                    <Save size={18} /> Simpan
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: KATEGORI MODAL */}
        {isCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-lg mb-4">{editingCat ? "Edit Kategori" : "Buat Kategori Baru"}</h3>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Tabungan</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="Misal: Beli Mobil Baru"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Dana (Opsional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold text-sm">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={catForm.target ? new Intl.NumberFormat("id-ID").format(Number(catForm.target)) : ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setCatForm({ ...catForm, target: val });
                      }}
                      className="w-full pl-9 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={closeCatModal} className="flex-1">
                    Batal
                  </Button>
                  <Button variant="primary" type="submit" className="flex-1">
                    {editingCat ? "Simpan" : "Buat"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: BNI MODAL (formerly IKAN MODAL) */}
        {isBniModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-teal-600 to-teal-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Building2 size={20} /> {editingBniTx ? "Edit Transaksi TABUNGAN BNI" : "Tambah Saldo TABUNGAN BNI"}
                </h3>
                <button
                  onClick={() => {
                    setIsBniModalOpen(false);
                    setEditingBniTx(null);
                  }}
                  className="text-white/80 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveBniTransaction} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBniForm({ ...bniForm, type: "in" })}
                    className={`py-2 rounded-md text-sm font-medium transition-all ${
                      bniForm.type === "in"
                        ? "bg-white dark:bg-slate-600 shadow text-green-600 dark:text-green-400"
                        : "text-slate-500"
                    }`}
                  >
                    Pemasukan (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBniForm({ ...bniForm, type: "out" })}
                    className={`py-2 rounded-md text-sm font-medium transition-all ${
                      bniForm.type === "out"
                        ? "bg-white dark:bg-slate-600 shadow text-red-600 dark:text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    Pengeluaran (-)
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jumlah Saldo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold text-lg">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      required
                      placeholder="0"
                      value={bniAmountInput ? new Intl.NumberFormat("id-ID").format(Number(bniAmountInput.replace(/\D/g, ""))) : ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setBniAmountInput(val);
                      }}
                      className="w-full pl-9 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Setor Tabungan BNI"
                    value={bniForm.description}
                    onChange={(e) => setBniForm({ ...bniForm, description: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={bniForm.date}
                    onChange={(e) => setBniForm({ ...bniForm, date: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsBniModalOpen(false);
                      setEditingBniTx(null);
                    }}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button variant="primary" type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                    <Save size={18} /> Simpan
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: SEARCH */}
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <Search size={20} className="text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setSearchQuery("");
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center p-8 text-slate-500">
                    Tidak ada transaksi ditemukan.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors mb-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getCategoryColor(tx.categoryId)}`}>
                          {tx.type === "in" ? <Plus size={18} /> : <Minus size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            {tx.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getCategoryName(tx.categoryId)} • {new Date(tx.date).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${tx.type === "in" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {tx.type === "in" ? "+" : "-"}{formatRupiah(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
