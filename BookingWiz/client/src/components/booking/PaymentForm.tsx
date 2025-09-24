import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Shield, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentFormProps {
  bookingId: string;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export function PaymentForm({ bookingId, onPaymentSuccess, onPaymentError }: PaymentFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions to continue",
        variant: "destructive",
      });
      return;
    }

    if (!cardData.number || !cardData.expiry || !cardData.cvc || !cardData.name) {
      toast({
        title: "Payment Information Required",
        description: "Please fill in all payment details",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Mock payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm payment on backend (mock)
      const response = await apiRequest("POST", "/api/confirm-payment", { 
        paymentIntentId: `pi_mock_${Date.now()}`,
        bookingId 
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onPaymentSuccess();
          toast({
            title: "Payment Successful",
            description: "Your booking has been confirmed!",
          });
        } else {
          throw new Error('Payment confirmation failed');
        }
      } else {
        throw new Error('Failed to confirm payment');
      }
    } catch (err: any) {
      onPaymentError(err.message || 'Payment processing failed');
      toast({
        title: "Payment Error",
        description: err.message || 'Payment processing failed',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-payment">
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center space-x-2 mb-4">
          <CreditCard className="text-primary text-xl" />
          <span className="font-medium text-foreground">Secure Payment</span>
          <Shield className="text-muted-foreground w-4 h-4" />
          <Lock className="text-muted-foreground w-4 h-4" />
        </div>
        
        {/* Payment Method Selection */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">Card</span>
            </button>
            <button
              type="button"
              className="p-3 border border-border rounded-lg flex items-center justify-center opacity-50 cursor-not-allowed"
              disabled
            >
              <span className="text-sm">PayPal</span>
            </button>
            <button
              type="button"
              className="p-3 border border-border rounded-lg flex items-center justify-center opacity-50 cursor-not-allowed"
              disabled
            >
              <span className="text-sm">Apple Pay</span>
            </button>
          </div>
        </div>

        {/* Card Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="cardNumber" className="text-sm font-medium">Card Number</Label>
            <Input
              id="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardData.number}
              onChange={(e) => setCardData({...cardData, number: e.target.value})}
              className="mt-1"
              data-testid="input-card-number"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="expiry" className="text-sm font-medium">MM/YY</Label>
              <Input
                id="expiry"
                type="text"
                placeholder="12/25"
                value={cardData.expiry}
                onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                className="mt-1"
                data-testid="input-card-expiry"
              />
            </div>
            <div>
              <Label htmlFor="cvc" className="text-sm font-medium">CVC</Label>
              <Input
                id="cvc"
                type="text"
                placeholder="123"
                value={cardData.cvc}
                onChange={(e) => setCardData({...cardData, cvc: e.target.value})}
                className="mt-1"
                data-testid="input-card-cvc"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cardName" className="text-sm font-medium">Cardholder Name</Label>
            <Input
              id="cardName"
              type="text"
              placeholder="John Doe"
              value={cardData.name}
              onChange={(e) => setCardData({...cardData, name: e.target.value})}
              className="mt-1"
              data-testid="input-card-name"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>Your payment information is encrypted and secure</span>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox 
          id="terms" 
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          data-testid="checkbox-terms"
        />
        <label htmlFor="terms" className="text-sm text-muted-foreground">
          I agree to the{' '}
          <a href="#" className="text-primary hover:underline">Terms and Conditions</a>{' '}
          and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </label>
      </div>

      <Button 
        type="submit" 
        disabled={!termsAccepted || isProcessing}
        className="w-full"
        data-testid="button-complete-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Complete Payment
          </>
        )}
      </Button>
    </form>
  );
}
