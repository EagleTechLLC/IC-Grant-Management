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

interface ActivityType {
  id: string;
  name: string;
  color: string;
}

interface Grant {
  id: string;
  name: string;
  grant_code: string;
  color: string;
  activityTypeIds: string[];
}

interface GrantFormDialogProps {
  grant?: Grant;
  action: (formData: FormData) => Promise<void>;
  activityTypes: ActivityType[];
}

export default function GrantFormDialog({
  grant,
  action,
  activityTypes,
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
      await action(formData);
      if (!isEdit) formRef.current?.reset();
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
            <label htmlFor="grant-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="grant-name"
              name="name"
              defaultValue={grant?.name}
              placeholder="e.g. Refugee Cash Assistance"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-code" className="text-sm font-medium">
              Grant Code
            </label>
            <Input
              id="grant-code"
              name="grant_code"
              defaultValue={grant?.grant_code}
              placeholder="e.g. RCA-2026"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-color" className="text-sm font-medium">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="grant-color"
                name="color"
                type="color"
                defaultValue={grant?.color ?? "#3b82f6"}
                className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
              />
              <span className="text-sm text-muted-foreground">
                Background tint on calendar events
              </span>
            </div>
          </div>
          {activityTypes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Activity Types</span>
              <div className="flex flex-col gap-1.5 rounded-md border border-input p-3">
                {activityTypes.map((at) => (
                  <label
                    key={at.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="activity_type_ids"
                      value={at.id}
                      defaultChecked={grant?.activityTypeIds.includes(at.id)}
                      className="rounded"
                    />
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: at.color }}
                    />
                    {at.name}
                  </label>
                ))}
              </div>
            </div>
          )}
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
