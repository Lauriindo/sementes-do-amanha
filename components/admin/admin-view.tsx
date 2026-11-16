"use client";

import { useState } from "react";
import { RoleManager } from "@/components/admin/role-manager";
import { TeamManager } from "@/components/admin/team-manager";
import { UserManager } from "@/components/admin/user-manager";
import { Tabs } from "@/components/ui/tabs";

type Section = "perfis" | "times" | "usuarios";

const ITEMS: { value: Section; label: string }[] = [
  { value: "perfis", label: "Tipos de perfil" },
  { value: "times", label: "Times e áreas" },
  { value: "usuarios", label: "Usuários" },
];

export function AdminView() {
  const [section, setSection] = useState<Section>("perfis");

  return (
    <div className="space-y-6">
      <Tabs value={section} onChange={setSection} items={ITEMS} />
      {section === "perfis" && <RoleManager />}
      {section === "times" && <TeamManager />}
      {section === "usuarios" && <UserManager />}
    </div>
  );
}
