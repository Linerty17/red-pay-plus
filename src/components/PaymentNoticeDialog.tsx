import { AlertTriangle, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const PaymentNoticeDialog = ({ open, onOpenChange, onConfirm }: PaymentNoticeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Important Payment Notice
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Important payment instructions and warnings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3 text-sm">
            <span className="text-foreground">•</span>
            <p className="text-foreground">
              Transfer the <span className="font-bold">exact amount</span> shown on this page.
            </p>
          </div>

          <div className="flex gap-3 text-sm">
            <span className="text-foreground">•</span>
            <p className="text-foreground">
              Upload a clear <span className="font-bold">payment screenshot</span> immediately after transfer.
            </p>
          </div>

          <div className="flex gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-foreground">
              <span className="font-bold text-destructive">Avoid using Opay bank.</span> Due to temporary network issues from Opay servers, payments made with Opay may not be confirmed. Please use{" "}
              <span className="font-bold">any other Nigerian bank</span> for instant confirmation.
            </p>
          </div>

          <div className="flex gap-3 text-sm">
            <CheckSquare className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <p className="text-foreground">
              Payments made with other banks are confirmed within minutes.
            </p>
          </div>

          <div className="flex gap-3 text-sm">
            <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-foreground">
              Do not dispute your payment under any circumstances — disputes delay confirmation.
            </p>
          </div>
        </div>

        <Button
          onClick={onConfirm}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          I Understand
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentNoticeDialog;
