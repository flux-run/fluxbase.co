"use client";
import { useState, useEffect, useCallback } from "react";

export type TeamRole = "owner" | "member" | "viewer";
export type TeamStatus = "active" | "invited";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
};

const SEED_USERS: TeamUser[] = [
  { id: "u_seed_1", name: "Shashi", email: "shashi@example.com", role: "owner", status: "active" },
];

const STORAGE_KEY = "flux_team_users";

function load(): TeamUser[] {
  if (typeof window === "undefined") return SEED_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TeamUser[];
  } catch {}
  return SEED_USERS;
}

function save(users: TeamUser[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function useTeam() {
  const [users, setUsers] = useState<TeamUser[]>(SEED_USERS);

  useEffect(() => {
    setUsers(load());
  }, []);

  const addUser = useCallback((name: string, email: string, role: TeamRole) => {
    const newUser: TeamUser = {
      id: `u_${Date.now()}`,
      name: name.trim() || email.split("@")[0],
      email: email.trim().toLowerCase(),
      role,
      status: "invited",
    };
    setUsers(prev => {
      const next = [...prev, newUser];
      save(next);
      return next;
    });
    return newUser;
  }, []);

  const updateRole = useCallback((id: string, role: TeamRole) => {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, role } : u);
      save(next);
      return next;
    });
  }, []);

  const removeUser = useCallback((id: string) => {
    setUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      save(next);
      return next;
    });
  }, []);

  const activeUsers = users.filter(u => u.status === "active");

  return { users, activeUsers, addUser, updateRole, removeUser };
}

/** Stable letter-avatar color derived from name */
export function avatarColor(name: string): string {
  const colors = [
    "bg-violet-700 text-violet-100",
    "bg-blue-700 text-blue-100",
    "bg-emerald-700 text-emerald-100",
    "bg-amber-700 text-amber-100",
    "bg-rose-700 text-rose-100",
    "bg-indigo-700 text-indigo-100",
    "bg-teal-700 text-teal-100",
    "bg-orange-700 text-orange-100",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}
