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

interface ActivityTypeFormDialogProps {
  activityType?: ActivityType;
  action: (formData: FormData) => Promise<void>;
}

export default function ActivityTypeFormDialog({
  activityType,
  action,
}: ActivityTypeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!activityType;

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
          <Button size="sm">New Activity Type</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Activity Type" : "New Activity Type"}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="at-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="at-name"
              name="name"
              defaultValue={activityType?.name}
              placeholder="e.g. Case Management"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="at-color" className="text-sm font-medium">
              Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="at-color"
                name="color"
                type="color"
                defaultValue={activityType?.color ?? "#6b7280"}
                className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
              />
              <span className="text-sm text-muted-foreground">
                Shown as the left stripe on calendar events
              </span>
            </div>
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
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
