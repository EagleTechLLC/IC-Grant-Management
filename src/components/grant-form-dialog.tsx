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

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#84cc16", // lime
  "#64748b", // slate
];

interface ActivityType {
  id: string;
  name: string;
  color: string;
  activity_code: string | null;
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
  const [selectedColor, setSelectedColor] = useState(
    grant?.color ?? PRESET_COLORS[0]
  );
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!grant;

  // Reset color when dialog opens
  const handleOpenChange = (val: boolean) => {
    if (val) setSelectedColor(grant?.color ?? PRESET_COLORS[0]);
    setOpen(val);
  };

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <span className="text-sm font-medium">Color</span>
            <p className="text-xs text-muted-foreground">
              Shows as background tint on calendar events
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: color,
                    boxShadow:
                      selectedColor === color
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : "none",
                  }}
                  title={color}
                />
              ))}
            </div>
            {/* Hidden input carries the selected color into FormData */}
            <input type="hidden" name="color" value={selectedColor} />
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
                    {at.activity_code && (
                      <span className="font-mono text-xs text-muted-foreground">{at.activity_code}</span>
                    )}
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
