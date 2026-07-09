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
  Fish,
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
const BNI_TRANSACTION_RANGE = "Tabungan BNI!A2:E";
const IKAN_TRANSACTION_RANGE = "Ikan!A2:E";

type Transaction = {
  id: number;
  categoryId: number;
  amount: number;
  type: "in" | "out";
  date: string;
  description: string;
};

type BNITransaction = {
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary:
      "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    outline:
      "border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "bni-history" | "ikan-history">("dashboard");
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

  const [bniBalance, setBniBalance] = useState(0);
  const [isBniModalOpen, setIsBniModalOpen] = useState(false);
  const [bniAmountInput, setBniAmountInput] = useState("");
  const [bniTransactions, setBniTransactions] = useState<BNITransaction[]>([]);
  const [bniForm, setBniForm] = useState({
    type: "in" as "in" | "out",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [ikanBalance, setIkanBalance] = useState(0);
  const [isIkanModalOpen, setIsIkanModalOpen] = useState(false);
  const [ikanAmountInput, setIkanAmountInput] = useState("");
  const [ikanTransactions, setIkanTransactions] = useState<BNITransaction[]>([]);
  const [ikanForm, setIkanForm] = useState({
    type: "in" as "in" | "out",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

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

  const parseBniTransactions = (rows: string[][]): BNITransaction[] => {
    const used = new Set<number>();
    const parsed: BNITransaction[] = [];
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

  const saveBniTransactions = async (data: BNITransaction[]) => {
    const rows = data.map((tx) => [tx.id, tx.amount, tx.type, tx.date, tx.description]);
    await writeValues(BNI_TRANSACTION_RANGE, rows);
  };

  const saveIkanTransactions = async (data: BNITransaction[]) => {
    const rows = data.map((tx) => [tx.id, tx.amount, tx.type, tx.date, tx.description]);
    await writeValues(IKAN_TRANSACTION_RANGE, rows);
  };

  const loadFromSheets = async () => {
    const [catRows, txRows, bniRows, ikanRows] = await Promise.all([
      fetchValues("Categories!A2:D1000"),
      fetchValues("Transactions!A2:F1000"),
      fetchValues("Tabungan BNI!A2:E1000"),
      fetchValues("Ikan!A2:E1000"),
    ]);
    const parsedCategories = parseCategories(catRows);
    const validCategoryIds = new Set(parsedCategories.map((cat) => cat.id));
    const parsedTransactions = parseTransactions(txRows, validCategoryIds);
    const parsedBniTransactions = parseBniTransactions(bniRows);
    const parsedIkanTransactions = parseBniTransactions(ikanRows);
    
    setCategories(parsedCategories);
    setTransactions(parsedTransactions);
    setBniTransactions(parsedBniTransactions);
    setIkanTransactions(parsedIkanTransactions);
    
    // Calculate BNI balance from transactions
    const bniBalance = parsedBniTransactions.reduce((acc, tx) => {
      return acc + (tx.type === "in" ? tx.amount : -tx.amount);
    }, 0);
    setBniBalance(bniBalance);

    // Calculate IKAN balance from transactions
    const ikanBalance = parsedIkanTransactions.reduce((acc, tx) => {
      return acc + (tx.type === "in" ? tx.amount : -tx.amount);
    }, 0);
    setIkanBalance(ikanBalance);
    
    const firstCategoryId = parsedCategories[0]?.id ?? "";
    setTxForm((prev) => ({ ...prev, categoryId: firstCategoryId }));
  };

  useEffect(() => {
    void loadFromSheets();
  }, []);

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
      setTxForm((prev) => ({ ...prev, categoryId: newCat.id }));
    }

    setCatForm({ name: "", target: "" });
    setIsCatModalOpen(false);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, target: cat.target ? String(cat.target) : "" });
    setIsCatModalOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (!window.confirm("Hapus kategori ini? Semua transaksi di kategori ini akan dihapus.")) return;
    const updatedCats = categories.filter((cat) => cat.id !== id);
    const updatedTx = transactions.filter((tx) => tx.categoryId !== id);
    setCategories(updatedCats);
    setTransactions(updatedTx);
    const nextCatId = updatedCats[0]?.id ?? "";
    setTxForm((prev) => ({ ...prev, categoryId: nextCatId }));
    void saveCategories(updatedCats);
    void saveTransactions(updatedTx);
    setEditingCat(null);
  };

  const openNewCategoryModal = () => {
    setEditingCat(null);
    setCatForm({ name: "", target: "" });
    setIsCatModalOpen(true);
  };

  const closeCatModal = () => {
    setIsCatModalOpen(false);
    setEditingCat(null);
    setCatForm({ name: "", target: "" });
  };

  const openTxModal = (preSelectedCategoryId: number | "" = "") => {
    setTxForm({
      categoryId: preSelectedCategoryId || categories[0]?.id || "",
      amount: "",
      type: "in",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setEditingTx(null);
    setIsTxModalOpen(true);
  };

  const closeTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTx(null);
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
  }, [searchQuery, sortedTransactions, getCategoryName]);

  return (
    <div className={`${darkMode ? "dark" : ""} transition-colors duration-300`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-20 md:pb-10 font-sans">
        <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 px-4 py-3 shadow-sm">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
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
              >
                {darkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-slate-600" />}
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl lg:max-w-4xl mx-auto p-4 space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <PiggyBank size={100} />
              </div>
              <p className="text-orange-100 font-medium mb-1">TABUNGAN BNI</p>
              <h2 className="text-3xl md:text-4xl font-bold">{formatRupiah(bniBalance)}</h2>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setBniAmountInput("");
                    setIsBniModalOpen(true);
                  }}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-all"
                >
                  <Plus size={16} /> Tambah Saldo
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Fish size={100} />
              </div>
              <p className="text-teal-100 font-medium mb-1">TABUNGAN IKAN</p>
              <h2 className="text-3xl md:text-4xl font-bold">{formatRupiah(ikanBalance)}</h2>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setIkanAmountInput("");
                    setIsIkanModalOpen(true);
                  }}
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

          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${
                activeTab === "dashboard"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700"
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
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${
                activeTab === "history"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700"
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
              onClick={() => setActiveTab("bni-history")}
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${
                activeTab === "bni-history"
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <PiggyBank size={16} /> Riwayat BNI
              </span>
              {activeTab === "bni-history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 dark:bg-orange-400 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("ikan-history")}
              className={`pb-2 px-4 font-medium text-sm transition-colors relative ${
                activeTab === "ikan-history"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <Fish size={16} /> Riwayat Ikan
              </span>
              {activeTab === "ikan-history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 dark:bg-teal-400 rounded-t-full" />
              )}
            </button>
          </div>

          {activeTab === "dashboard" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const balance = categoryBalances[cat.id] || 0;
                  const target = cat.target || 0;
                  const progress = target > 0 ? Math.min((balance / target) * 100, 100) : 0;

                  return (
                    <Card
                      key={cat.id}
                      className="group hover:border-blue-300 dark:hover:border-blue-700 transition-colors relative cursor-pointer"
                      onClick={() => openTxModal(cat.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center text-white shadow-sm`}>
                          <Wallet size={20} />
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(cat);
                            }}
                            className="bg-blue-50 dark:bg-slate-700 p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600"
                            aria-label="Edit kategori"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id);
                            }}
                            className="bg-red-50 dark:bg-slate-700 p-1.5 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-slate-600"
                            aria-label="Hapus kategori"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 truncate">{cat.name}</h3>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{formatRupiah(balance)}</p>

                      {target > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Tercapai: {Math.round(progress)}%</span>
                            <span>
                              Target: {new Intl.NumberFormat("id-ID", { compactDisplay: "short", notation: "compact" }).format(target)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`${cat.color} h-full rounded-full transition-all duration-700`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}

                <button
                  onClick={openNewCategoryModal}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all min-h-[140px]"
                >
                  <Plus size={32} className="mb-2" />
                  <span className="font-medium">Buat Kategori Baru</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Riwayat Mutasi</h3>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Belum ada transaksi tercatat.</p>
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

              <Card className="border-orange-200 dark:border-orange-900/50">
                <div className="mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                    <PiggyBank size={20} />
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
                              <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white bg-opacity-80">
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
                              onClick={() => {
                                setBniTransactions((prev) => {
                                  const updated = prev.filter((t) => t.id !== tx.id);
                                  void saveBniTransactions(updated);
                                  const adjustedAmount = tx.type === "in" ? -tx.amount : tx.amount;
                                  setBniBalance(prev => prev + adjustedAmount);
                                  return updated;
                                });
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

          {activeTab === "bni-history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-orange-200 dark:border-orange-900/50">
                <div className="mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                    <PiggyBank size={20} />
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
                              <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white bg-opacity-80">
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
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setBniTransactions((prev) => {
                                  const updated = prev.filter((t) => t.id !== tx.id);
                                  void saveBniTransactions(updated);
                                  const adjustedAmount = tx.type === "in" ? -tx.amount : tx.amount;
                                  setBniBalance(prev => prev + adjustedAmount);
                                  return updated;
                                });
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

          {activeTab === "ikan-history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-teal-200 dark:border-teal-900/50">
                <div className="mb-4 flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <Fish size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Riwayat TABUNGAN IKAN</h3>
                </div>

                {ikanTransactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Belum ada transaksi TABUNGAN IKAN tercatat.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...ikanTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
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
                            <p className="text-xs text-slate-500 mt-1">{tx.date}</p>
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
                              onClick={() => {
                                if (window.confirm("Yakin ingin menghapus transaksi IKAN ini?")) {
                                  const updated = ikanTransactions.filter((t) => t.id !== tx.id);
                                  setIkanTransactions(updated);
                                  const newBalance = updated.reduce((acc, t) => acc + (t.type === "in" ? t.amount : -t.amount), 0);
                                  setIkanBalance(newBalance);
                                  void saveIkanTransactions(updated);
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Tabungan</label>
                  <select
                    required
                    value={txForm.categoryId}
                    onChange={(e) => setTxForm({ ...txForm, categoryId: Number(e.target.value) })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      -- Pilih Kategori --
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0"
                      value={txForm.amount ? new Intl.NumberFormat("id-ID").format(Number(txForm.amount)) : ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setTxForm({ ...txForm, amount: val });
                      }}
                      className="w-full pl-10 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
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

        {isBniModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-500 to-orange-600 flex justify-between items-center">
                <h3 className="font-bold text-lg text-white">Tambah Saldo TABUNGAN BNI</h3>
                <button onClick={() => setIsBniModalOpen(false)} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(bniAmountInput.replace(/\D/g, ""));
                  if (amount > 0) {
                    const newBniTx: BNITransaction = {
                      id: Math.max(0, ...bniTransactions.map(tx => tx.id)) + 1,
                      amount,
                      type: bniForm.type,
                      date: bniForm.date,
                      description: bniForm.description,
                    };
                    
                    setBniTransactions((prev) => {
                      const updated = [newBniTx, ...prev];
                      void saveBniTransactions(updated);
                      return updated;
                    });
                    
                    const adjustedAmount = bniForm.type === "in" ? amount : -amount;
                    setBniBalance(prev => prev + adjustedAmount);
                    setIsBniModalOpen(false);
                    setBniAmountInput("");
                    setBniForm({ type: "in", description: "", date: new Date().toISOString().split("T")[0] });
                  }
                }}
                className="p-6 space-y-4"
              >
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
                      className="w-full pl-9 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gaji Bulanan"
                    value={bniForm.description}
                    onChange={(e) => setBniForm({ ...bniForm, description: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={bniForm.date}
                    onChange={(e) => setBniForm({ ...bniForm, date: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsBniModalOpen(false)} className="flex-1">
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

        {isIkanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 scale-100 animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <Fish size={20} /> Transaksi TABUNGAN IKAN
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!ikanAmountInput) return;
                  const newTx: BNITransaction = {
                    id: Date.now(), // simple unique id
                    amount: Number(ikanAmountInput.replace(/\D/g, "")),
                    type: ikanForm.type,
                    description: ikanForm.description,
                    date: ikanForm.date,
                  };
                  const updated = [newTx, ...ikanTransactions];
                  setIkanTransactions(updated);
                  const newBalance = updated.reduce((acc, tx) => acc + (tx.type === "in" ? tx.amount : -tx.amount), 0);
                  setIkanBalance(newBalance);
                  void saveIkanTransactions(updated);
                  setIsIkanModalOpen(false);
                  setIkanForm({ type: "in", description: "", date: new Date().toISOString().split("T")[0] });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIkanForm({ ...ikanForm, type: "in" })}
                      className={`p-2 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${
                        ikanForm.type === "in"
                          ? "bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      <Plus size={16} /> Setor
                    </button>
                    <button
                      type="button"
                      onClick={() => setIkanForm({ ...ikanForm, type: "out" })}
                      className={`p-2 rounded-lg border font-medium flex items-center justify-center gap-2 transition-all ${
                        ikanForm.type === "out"
                          ? "bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      <Minus size={16} /> Tarik
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 font-bold text-lg">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      required
                      placeholder="0"
                      value={ikanAmountInput ? new Intl.NumberFormat("id-ID").format(Number(ikanAmountInput.replace(/\D/g, ""))) : ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setIkanAmountInput(val);
                      }}
                      className="w-full pl-9 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none text-lg font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Panen Lele"
                    value={ikanForm.description}
                    onChange={(e) => setIkanForm({ ...ikanForm, description: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={ikanForm.date}
                    onChange={(e) => setIkanForm({ ...ikanForm, date: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsIkanModalOpen(false)} className="flex-1">
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
