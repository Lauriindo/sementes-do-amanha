"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPassword("");
    setConfirm("");
    setError(null);
    setDone(false);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");
    setBusy(true);
    const err = await changePassword(password);
    setBusy(false);
    if (err) return setError(err);
    setDone(true);
  };

  return (
    <Dialog open={open} onClose={close} title="Trocar minha senha">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Senha alterada com sucesso.</p>
          <Button className="w-full" onClick={close}>
            Fechar
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirme a nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </Dialog>
  );
}

/** Usuário logado, com atalhos para trocar a senha e sair. */
export function UserMenu({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { signOut } = useAuth();
  const { currentUser, currentRole } = useStore();
  const [pwOpen, setPwOpen] = useState(false);
  if (!currentUser) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-bold text-slate-800">{currentUser.nome}</p>
        {!compact && <p className="truncate text-xs text-slate-500">{currentRole?.nome}</p>}
      </div>
      <Button variant="ghost" size="icon" aria-label="Trocar minha senha" title="Trocar minha senha" onClick={() => setPwOpen(true)}>
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Sair" title="Sair" onClick={() => void signOut()}>
        <LogOut className="h-4 w-4" />
      </Button>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
