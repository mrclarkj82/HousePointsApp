import { Database, FileUp, History, Pencil, RotateCcw, Settings, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import HouseBadge from "../components/HouseBadge";
import {
  assignStudentHouse,
  createSeason,
  deleteCategory,
  editTransactionAmount,
  importStudents,
  importTeachers,
  listenCategories,
  listenHouses,
  listenPointTransactions,
  listenSeasons,
  listenStudents,
  listenTeachers,
  listenUsers,
  reverseTransaction,
  saveCategory,
  seedDefaultData,
  setActiveSeason,
  updateCategoryStatus,
  updateUserRole,
} from "../services/firestore";
import { parseCsvFile } from "../utils/csv";
import {
  HOUSES,
  classNames,
  formatDateTime,
  getHouseName,
  normalizeHouseId,
  slugify,
} from "../utils/constants";

const TABS = [
  { id: "setup", label: "Setup", icon: Settings },
  { id: "people", label: "People", icon: Users },
  { id: "audit", label: "Audit", icon: History },
];

function toDate(value) {
  if (!value) return null;
  return typeof value.toDate === "function" ? value.toDate() : new Date(value);
}

export default function AdminDashboard({ profile }) {
  const [activeTab, setActiveTab] = useState("setup");
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [users, setUsers] = useState([]);
  const [houses, setHouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSeason, setNewSeason] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    houseId: "",
    category: "",
    amount: "",
    dateFrom: "",
    dateTo: "",
  });
  const [reversalReasons, setReversalReasons] = useState({});
  const [editAmounts, setEditAmounts] = useState({});

  useEffect(() => {
    const onError = (nextError) => setError(nextError.message);
    const unsubscribers = [
      listenStudents(setStudents, onError),
      listenTeachers(setTeachers, onError),
      listenUsers(setUsers, onError),
      listenHouses(setHouses, onError),
      listenCategories(setCategories, onError),
      listenSeasons(setSeasons, onError),
      listenPointTransactions(setTransactions, onError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const activeCategories = categories.filter((category) => !category.deleted);
  const studentMatches = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return students
      .filter((student) => {
        if (!term) return true;
        return [student.name, student.email, student.grade, student.period, getHouseName(student.houseId)]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 80);
  }, [studentSearch, students]);

  const filteredTransactions = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const amount = Number(filters.amount);
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

    return transactions.filter((transaction) => {
      const created = toDate(transaction.createdAt);
      if (searchTerm) {
        const haystack = [
          transaction.studentName,
          transaction.teacherName,
          transaction.note,
          transaction.category,
          transaction.houseName,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchTerm)) return false;
      }
      if (filters.houseId && transaction.houseId !== filters.houseId) return false;
      if (filters.category && transaction.category !== filters.category) return false;
      if (amount && Number(transaction.amount) !== amount) return false;
      if (from && created && created < from) return false;
      if (to && created && created > to) return false;
      return true;
    });
  }, [filters, transactions]);

  async function handleStudentImport(file) {
    if (!file) return;
    setMessage("");
    setError("");
    try {
      const rows = await parseCsvFile(file, ["name", "email", "grade", "period", "house"]);
      await importStudents(rows);
      setMessage(`Imported ${rows.length} students.`);
    } catch (importError) {
      setError(importError.message);
    }
  }

  async function handleTeacherImport(file) {
    if (!file) return;
    setMessage("");
    setError("");
    try {
      const rows = await parseCsvFile(file, ["name", "email", "role"]);
      await importTeachers(rows);
      setMessage(`Imported ${rows.length} teachers.`);
    } catch (importError) {
      setError(importError.message);
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    if (!newCategory.trim()) return;
    await saveCategory({ id: slugify(newCategory), name: newCategory.trim(), active: true });
    setNewCategory("");
    setMessage("Category saved.");
  }

  async function handleCreateSeason(event) {
    event.preventDefault();
    if (!newSeason.trim()) return;
    await createSeason(newSeason.trim());
    setNewSeason("");
    setMessage("Season created.");
  }

  async function handleReverse(transaction) {
    const reason = reversalReasons[transaction.id] || "Corrected by admin";
    await reverseTransaction(transaction, profile, reason);
    setMessage("Transaction reversed.");
  }

  async function handleEditAmount(transaction) {
    const nextAmount = editAmounts[transaction.id];
    if (!nextAmount) return;
    await editTransactionAmount(transaction, profile, nextAmount);
    setEditAmounts((current) => ({ ...current, [transaction.id]: "" }));
    setMessage("Transaction amount updated.");
  }

  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-doral-red">Admin</p>
            <h2 className="section-title">Manage house points</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={classNames(
                    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black",
                    activeTab === tab.id ? "bg-white text-doral-red shadow-sm" : "text-slate-600"
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {message ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      {activeTab === "setup" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-slate-950">Imports</h3>
              <FileUp className="text-doral-red" size={24} aria-hidden="true" />
            </div>
            <div className="grid gap-4">
              <ImportBox
                title="Student CSV"
                body="student name, email, grade, period/advisory, house"
                onFile={handleStudentImport}
              />
              <ImportBox title="Teacher CSV" body="teacher name, email, role" onFile={handleTeacherImport} />
              <button type="button" onClick={seedDefaultData} className="btn-secondary w-full">
                <Database size={20} aria-hidden="true" />
                Seed houses, categories, and seasons
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-slate-950">Categories</h3>
              <Settings className="text-doral-red" size={24} aria-hidden="true" />
            </div>
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className="input"
                placeholder="New category"
              />
              <button type="submit" className="btn-primary sm:w-36">
                Add
              </button>
            </form>
            <div className="mt-4 grid gap-3">
              {activeCategories.map((category) => (
                <article key={category.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-slate-950">{category.name}</p>
                      <p className="text-sm font-semibold text-slate-500">{category.active ? "Active" : "Disabled"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => updateCategoryStatus(category.id, !category.active)}
                        className="btn-secondary min-h-11 px-3 py-2 text-sm"
                      >
                        {category.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(category.id)}
                        className="btn-secondary min-h-11 px-3 py-2 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-slate-950">Seasons</h3>
              <ShieldCheck className="text-doral-red" size={24} aria-hidden="true" />
            </div>
            <form onSubmit={handleCreateSeason} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newSeason}
                onChange={(event) => setNewSeason(event.target.value)}
                className="input"
                placeholder="Quarter 1, Semester 1, Full Year"
              />
              <button type="submit" className="btn-primary sm:w-36">
                Create
              </button>
            </form>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setActiveSeason(season.id, seasons)}
                  className={classNames(
                    "min-h-20 rounded-lg border p-4 text-left font-black",
                    season.active ? "border-doral-red bg-red-50 text-doral-red" : "border-slate-200 bg-white text-slate-900"
                  )}
                >
                  {season.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "people" ? (
        <div className="space-y-5">
          <section className="panel">
            <h3 className="text-xl font-black text-slate-950">Students</h3>
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              className="input mt-3"
              placeholder="Search students"
            />
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {studentMatches.length ? (
                studentMatches.map((student) => (
                  <article key={student.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-slate-950">{student.name}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {student.email} · Grade {student.grade || "-"} · {student.period || "No period"}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-950">
                          {Number(student.totalPoints || 0).toLocaleString()} points
                        </p>
                      </div>
                        <select
                          value={normalizeHouseId(student.houseId)}
                          onChange={(event) => assignStudentHouse(student.id, event.target.value)}
                          className="input sm:w-48"
                        >
                          <option value="">Unassigned</option>
                          {HOUSES.map((house) => (
                            <option key={house.id} value={house.id}>
                            {house.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="No students found" />
              )}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="panel">
              <h3 className="text-xl font-black text-slate-950">Teachers</h3>
              <div className="mt-4 grid gap-3">
                {teachers.length ? (
                  teachers.map((teacher) => (
                    <div key={teacher.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black text-slate-950">{teacher.name}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{teacher.email}</p>
                      <p className="mt-2 text-sm font-bold text-doral-red">{teacher.role}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No teachers imported" />
                )}
              </div>
            </article>

            <article className="panel">
              <h3 className="text-xl font-black text-slate-950">Users</h3>
              <div className="mt-4 grid gap-3">
                {users.length ? (
                  users.map((user) => (
                    <div key={user.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{user.displayName || user.email}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">{user.email}</p>
                        </div>
                        <select
                          value={user.role || "pending"}
                          onChange={(event) => updateUserRole(user.id, event.target.value, user.email)}
                          className="input sm:w-40"
                        >
                          <option value="pending">Pending</option>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No signed-in users yet" />
                )}
              </div>
            </article>
          </section>

          <section className="panel">
            <h3 className="text-xl font-black text-slate-950">Houses</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(houses.length ? houses : HOUSES).map((house) => (
                <article key={house.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <HouseBadge houseId={house.id} />
                  <p className="mt-3 text-3xl font-black text-slate-950">{Number(house.totalPoints || 0).toLocaleString()}</p>
                  <p className="text-sm font-semibold text-slate-500">points</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <section className="panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-950">Point transaction audit log</h3>
            <History className="text-doral-red" size={24} aria-hidden="true" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              className="input xl:col-span-2"
              placeholder="Teacher, student, note"
            />
            <select
              value={filters.houseId}
              onChange={(event) => setFilters((current) => ({ ...current, houseId: event.target.value }))}
              className="input"
            >
              <option value="">All houses</option>
              {HOUSES.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              className="input"
            >
              <option value="">All categories</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={filters.amount}
              onChange={(event) => setFilters((current) => ({ ...current, amount: event.target.value }))}
              className="input"
              placeholder="Amount"
            />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              className="input"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              className="input"
            />
          </div>

          <div className="mt-5 grid gap-3">
            {filteredTransactions.length ? (
              filteredTransactions.map((transaction) => (
                <article key={transaction.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-black text-slate-950">+{transaction.amount}</p>
                        <HouseBadge houseId={transaction.houseId} />
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600">
                          {transaction.category}
                        </span>
                        {transaction.reversed ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">Reversed</span>
                        ) : null}
                      </div>
                      <p className="mt-3 font-semibold text-slate-700">
                        {transaction.studentName || transaction.houseName || getHouseName(transaction.houseId)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {transaction.teacherName || "Unknown teacher"} · {formatDateTime(transaction.createdAt)} · {transaction.awardType}
                      </p>
                      {transaction.note ? <p className="mt-2 text-sm text-slate-600">{transaction.note}</p> : null}
                      {transaction.reversalReason ? (
                        <p className="mt-2 text-sm font-semibold text-red-700">{transaction.reversalReason}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={editAmounts[transaction.id] || ""}
                          onChange={(event) =>
                            setEditAmounts((current) => ({ ...current, [transaction.id]: event.target.value }))
                          }
                          className="input min-h-11 py-2"
                          placeholder="New amount"
                          disabled={transaction.reversed}
                        />
                        <button
                          type="button"
                          onClick={() => handleEditAmount(transaction)}
                          disabled={transaction.reversed}
                          className="btn-secondary min-h-11 px-3 py-2"
                          aria-label="Edit amount"
                        >
                          <Pencil size={18} aria-hidden="true" />
                        </button>
                      </div>
                      <input
                        value={reversalReasons[transaction.id] || ""}
                        onChange={(event) =>
                          setReversalReasons((current) => ({ ...current, [transaction.id]: event.target.value }))
                        }
                        className="input min-h-11 py-2"
                        placeholder="Reversal reason"
                        disabled={transaction.reversed}
                      />
                      <button
                        type="button"
                        onClick={() => handleReverse(transaction)}
                        disabled={transaction.reversed}
                        className="btn-secondary min-h-11 px-3 py-2"
                      >
                        <RotateCcw size={18} aria-hidden="true" />
                        Reverse
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="No transactions match these filters" />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ImportBox({ title, body, onFile }) {
  return (
    <label className="block rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <span className="block text-lg font-black text-slate-950">{title}</span>
      <span className="mt-1 block text-sm font-semibold text-slate-600">{body}</span>
      <input
        type="file"
        accept=".csv,text/csv"
        className="mt-4 block w-full text-sm font-semibold text-slate-700 file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-doral-red file:px-4 file:font-bold file:text-white"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </label>
  );
}
