"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Grant {
  id: string;
  name: string;
  grant_code: string;
}

interface GrantFormDialogProps {
  grant?: Grant;
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (id: string, formData: FormData) => Promise<void>;
}

export default function GrantFormDialog({
  grant,
  createAction,
  updateAction,
}: GrantFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!grant;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    try {
      if (isEdit) {
        await updateAction(grant.id, formData);
      } else {
        await createAction(formData);
        formRef.current?.reset();
      }
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        ) : (
          <Button size="sm">New Grant</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Grant" : "New Grant"}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={grant?.name}
              placeholder="e.g. Refugee Cash Assistance"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant_code" className="text-sm font-medium">
              Grant Code
            </label>
            <Input
              id="grant_code"
              name="grant_code"
              defaultValue={grant?.grant_code}
              placeholder="e.g. RCA-2026"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Grant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
