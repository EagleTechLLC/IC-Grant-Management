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
  const [selectedColor, setSelectedColor] = useState(
    activityType?.color ?? PRESET_COLORS[0]
  );
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!activityType;

  const handleOpenChange = (val: boolean) => {
    if (val) setSelectedColor(activityType?.color ?? PRESET_COLORS[0]);
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
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 w-24 shrink-0">
              <label htmlFor="at-code" className="text-sm font-medium">
                Code
              </label>
              <Input
                id="at-code"
                name="activity_code"
                defaultValue={activityType?.activity_code ?? ""}
                placeholder="CM"
                maxLength={10}
                className="uppercase"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
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
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Color</span>
            <p className="text-xs text-muted-foreground">
              Shows as left stripe on calendar events
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
            <input type="hidden" name="color" value={selectedColor} />
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
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
