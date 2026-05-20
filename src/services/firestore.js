import {
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SEASONS,
  HOUSES,
  HOUSE_BY_ID,
  emailKey,
  getActiveSeasonId,
  normalizeHouseId,
  slugify,
} from "../utils/constants";

function docList(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function seededAdminEmails() {
  return String(import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAILS || "joseph.clark@doralacademynv.org")
    .split(",")
    .map(emailKey)
    .filter(Boolean);
}

export async function ensureUserProfile(firebaseUser) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);
  const email = firebaseUser.email || "";
  const lowerEmail = emailKey(email);
  const studentSnap = lowerEmail ? await getDoc(doc(db, "students", lowerEmail)) : null;
  const teacherSnap = lowerEmail ? await getDoc(doc(db, "teachers", lowerEmail)) : null;
  const teacherData = teacherSnap?.exists() ? teacherSnap.data() : null;
  const studentData = studentSnap?.exists() ? studentSnap.data() : null;
  const bootstrapAdmin = seededAdminEmails().includes(lowerEmail);

  let resolvedRole = "pending";
  if (bootstrapAdmin) resolvedRole = "admin";
  else if (teacherData?.role === "admin") resolvedRole = "admin";
  else if (teacherData) resolvedRole = "teacher";
  else if (studentData) resolvedRole = "student";

  const linkFields = {
    uid: firebaseUser.uid,
    email,
    emailLower: lowerEmail,
    displayName: firebaseUser.displayName || studentData?.name || teacherData?.name || email,
    photoURL: firebaseUser.photoURL || "",
    lastLoginAt: serverTimestamp(),
  };

  if (existing.exists()) {
    const current = existing.data();
    const shouldResolveRole = current.role === "pending" && resolvedRole !== "pending";
    const updates = {
      ...linkFields,
      ...(shouldResolveRole
        ? {
            role: resolvedRole,
            studentId: studentData ? lowerEmail : "",
            teacherId: teacherData || bootstrapAdmin ? lowerEmail : "",
            active: true,
          }
        : {}),
    };
    await setDoc(userRef, updates, { merge: true });
    return { id: existing.id, ...current, ...updates };
  }

  const profile = {
    ...linkFields,
    role: resolvedRole,
    studentId: studentData ? lowerEmail : "",
    teacherId: teacherData || bootstrapAdmin ? lowerEmail : "",
    active: true,
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, profile, { merge: true });
  return { id: firebaseUser.uid, ...profile };
}

export function listenHouses(callback, onError) {
  return onSnapshot(collection(db, "houses"), (snapshot) => callback(docList(snapshot)), onError);
}

export function listenCategories(callback, onError) {
  return onSnapshot(query(collection(db, "categories"), orderBy("name")), (snapshot) => callback(docList(snapshot)), onError);
}

export function listenSeasons(callback, onError) {
  return onSnapshot(query(collection(db, "seasons"), orderBy("sortOrder")), (snapshot) => callback(docList(snapshot)), onError);
}

export function listenStudents(callback, onError) {
  return onSnapshot(query(collection(db, "students"), orderBy("name")), (snapshot) => callback(docList(snapshot)), onError);
}

export function listenTeachers(callback, onError) {
  return onSnapshot(query(collection(db, "teachers"), orderBy("name")), (snapshot) => callback(docList(snapshot)), onError);
}

export function listenUsers(callback, onError) {
  return onSnapshot(query(collection(db, "users"), orderBy("displayName")), (snapshot) => callback(docList(snapshot)), onError);
}

export function listenStudent(studentId, callback, onError) {
  if (!studentId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(doc(db, "students", studentId), (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null), onError);
}

export function listenRecentStudentAwards(studentId, callback, onError) {
  if (!studentId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(
      collection(db, "pointTransactions"),
      where("studentId", "==", studentId),
      where("reversed", "==", false),
      orderBy("createdAt", "desc"),
      limit(15)
    ),
    (snapshot) => callback(docList(snapshot)),
    onError
  );
}

export function listenTeacherAwards(teacherId, callback, onError) {
  if (!teacherId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, "pointTransactions"), where("teacherId", "==", teacherId), orderBy("createdAt", "desc"), limit(20)),
    (snapshot) => callback(docList(snapshot)),
    onError
  );
}

export function listenPointTransactions(callback, onError) {
  return onSnapshot(query(collection(db, "pointTransactions"), orderBy("createdAt", "desc"), limit(750)), (snapshot) => callback(docList(snapshot)), onError);
}

export async function seedDefaultData() {
  const batch = writeBatch(db);
  HOUSES.forEach((house) => {
    batch.set(
      doc(db, "houses", house.id),
      {
        id: house.id,
        name: house.name,
        color: house.color,
        totalPoints: increment(0),
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  DEFAULT_CATEGORIES.forEach((name, index) => {
    const id = slugify(name);
    batch.set(
      doc(db, "categories", id),
      {
        id,
        name,
        active: true,
        sortOrder: index,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  DEFAULT_SEASONS.forEach((name, index) => {
    const id = slugify(name);
    batch.set(
      doc(db, "seasons", id),
      {
        id,
        name,
        active: id === "full-year",
        sortOrder: index,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

export async function importStudents(rows) {
  let batch = writeBatch(db);
  let writes = 0;

  async function commitIfNeeded(nextWrites) {
    if (writes + nextWrites <= 450) return;
    await batch.commit();
    batch = writeBatch(db);
    writes = 0;
  }

  for (const row of rows) {
    const lowerEmail = emailKey(row.email);
    if (!lowerEmail || !row.name) continue;
    const houseId = normalizeHouseId(row.house);
    const studentRef = doc(db, "students", lowerEmail);
    await commitIfNeeded(row.period ? 2 : 1);
    batch.set(
      studentRef,
      {
        id: lowerEmail,
        name: row.name,
        email: row.email,
        emailLower: lowerEmail,
        grade: String(row.grade || ""),
        period: String(row.period || ""),
        houseId,
        totalPoints: increment(0),
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    writes += 1;

    if (row.period) {
      const periodId = slugify(row.period);
      batch.set(
        doc(db, "classesOrPeriods", periodId),
        {
          id: periodId,
          name: row.period,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      writes += 1;
    }
  }

  if (writes) await batch.commit();
}

export async function importTeachers(rows) {
  let batch = writeBatch(db);
  let writes = 0;

  async function commitIfNeeded() {
    if (writes < 450) return;
    await batch.commit();
    batch = writeBatch(db);
    writes = 0;
  }

  for (const row of rows) {
    const lowerEmail = emailKey(row.email);
    if (!lowerEmail || !row.name) continue;
    await commitIfNeeded();
    const role = String(row.role || "teacher").trim().toLowerCase() === "admin" ? "admin" : "teacher";
    batch.set(
      doc(db, "teachers", lowerEmail),
      {
        id: lowerEmail,
        name: row.name,
        email: row.email,
        emailLower: lowerEmail,
        role,
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    writes += 1;
  }

  if (writes) await batch.commit();
}

export async function assignStudentHouse(studentId, houseId) {
  await updateDoc(doc(db, "students", studentId), {
    houseId,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserRole(userId, role, email = "") {
  const lowerEmail = emailKey(email);
  const linkFields =
    role === "student"
      ? { studentId: lowerEmail, teacherId: "" }
      : role === "teacher" || role === "admin"
        ? { teacherId: lowerEmail, studentId: "" }
        : {};

  await updateDoc(doc(db, "users", userId), {
    role,
    ...linkFields,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCategory(category) {
  const id = category.id || slugify(category.name);
  await setDoc(
    doc(db, "categories", id),
    {
      id,
      name: category.name,
      active: category.active ?? true,
      sortOrder: category.sortOrder ?? 99,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateCategoryStatus(categoryId, active) {
  await updateDoc(doc(db, "categories", categoryId), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(categoryId) {
  await updateDoc(doc(db, "categories", categoryId), {
    active: false,
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}

export async function setActiveSeason(seasonId, seasons = []) {
  const batch = writeBatch(db);
  seasons.forEach((season) => {
    batch.set(doc(db, "seasons", season.id), { active: season.id === seasonId }, { merge: true });
  });
  await batch.commit();
}

export async function createSeason(name) {
  const id = slugify(name);
  await setDoc(
    doc(db, "seasons", id),
    {
      id,
      name,
      active: false,
      sortOrder: 99,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function awardPoints({ teacherProfile, students = [], directHouseId, amount, category, note, seasonId, awardType }) {
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) throw new Error("Choose a positive point amount.");
  if (!category) throw new Error("Choose a category.");

  const targets = directHouseId
    ? [{ id: null, name: HOUSE_BY_ID[directHouseId]?.name || directHouseId, houseId: directHouseId }]
    : students;

  if (!targets.length) throw new Error("Choose at least one student or house.");

  const batch = writeBatch(db);
  const resolvedSeasonId = seasonId || "full-year";
  const teacherId = teacherProfile.teacherId || teacherProfile.uid || teacherProfile.id;
  const teacherName = teacherProfile.displayName || teacherProfile.name || teacherProfile.email || "Teacher";

  targets.forEach((target) => {
    const houseId = target.houseId || directHouseId;
    if (!houseId) return;
    const transactionRef = doc(collection(db, "pointTransactions"));
    batch.set(transactionRef, {
      transactionId: transactionRef.id,
      studentId: target.id || target.studentId || null,
      studentName: target.id ? target.name : null,
      houseId,
      houseName: HOUSE_BY_ID[houseId]?.name || target.houseName || houseId,
      teacherId,
      teacherName,
      amount: numericAmount,
      category,
      note: note || "",
      createdAt: serverTimestamp(),
      seasonId: resolvedSeasonId,
      awardType,
      reversed: false,
      reversedBy: null,
      reversedAt: null,
      reversalReason: "",
    });

    if (target.id || target.studentId) {
      batch.set(
        doc(db, "students", target.id || target.studentId),
        {
          totalPoints: increment(numericAmount),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    batch.set(
      doc(db, "houses", houseId),
      {
        id: houseId,
        name: HOUSE_BY_ID[houseId]?.name || houseId,
        totalPoints: increment(numericAmount),
        [`seasonTotals.${resolvedSeasonId}`]: increment(numericAmount),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  return targets.length;
}

export async function reverseTransaction(transaction, adminProfile, reason) {
  if (transaction.reversed) return;
  const batch = writeBatch(db);
  const amount = Number(transaction.amount || 0);

  batch.update(doc(db, "pointTransactions", transaction.id), {
    reversed: true,
    reversedBy: adminProfile.uid || adminProfile.id,
    reversedAt: serverTimestamp(),
    reversalReason: reason || "Corrected by admin",
  });

  if (transaction.studentId) {
    batch.set(
      doc(db, "students", transaction.studentId),
      {
        totalPoints: increment(-amount),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (transaction.houseId) {
    batch.set(
      doc(db, "houses", transaction.houseId),
      {
        totalPoints: increment(-amount),
        [`seasonTotals.${transaction.seasonId || "full-year"}`]: increment(-amount),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

export async function editTransactionAmount(transaction, adminProfile, nextAmount) {
  const amount = Number(nextAmount);
  if (!amount || amount <= 0) throw new Error("Amount must be positive.");
  const previous = Number(transaction.amount || 0);
  const delta = amount - previous;
  if (delta === 0) return;

  const batch = writeBatch(db);
  batch.update(doc(db, "pointTransactions", transaction.id), {
    amount,
    editedBy: adminProfile.uid || adminProfile.id,
    editedAt: serverTimestamp(),
  });

  if (transaction.studentId) {
    batch.set(
      doc(db, "students", transaction.studentId),
      {
        totalPoints: increment(delta),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (transaction.houseId) {
    batch.set(
      doc(db, "houses", transaction.houseId),
      {
        totalPoints: increment(delta),
        [`seasonTotals.${transaction.seasonId || getActiveSeasonId()}`]: increment(delta),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}
