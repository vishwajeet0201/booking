import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ExperienceCard } from "./ExperienceCard";
import { PaymentForm } from "./PaymentForm";
import { Experience, Booking } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Mountain, Check, Calendar, Download } from "lucide-react";

const bookingFormSchema = z.object({
  experienceId: z.string().min(1, "Please select an experience"),
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  participants: z.number().min(1, "At least 1 participant is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  specialRequests: z.string().optional(),
  totalAmount: z.string(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      experienceId: "",
      checkinDate: "",
      checkoutDate: "",
      participants: 1,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialRequests: "",
      totalAmount: "0",
    },
  });

  // Fetch experiences
  const { data: experiences = [], isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: Omit<BookingFormData, 'totalAmount'> & { totalAmount: string }) => {
      const response = await apiRequest("POST", "/api/bookings", data);
      return response.json();
    },
    onSuccess: (booking: Booking) => {
      setBookingId(booking.id);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
  });

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async ({ amount, bookingId }: { amount: number; bookingId: string }) => {
      const response = await apiRequest("POST", "/api/create-payment-intent", { 
        amount, 
        bookingId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
  });

  const totalSteps = 4;

  const handleExperienceSelect = (experience: Experience) => {
    setSelectedExperience(experience);
    form.setValue('experienceId', experience.id);
  };

  const calculateTotal = () => {
    if (!selectedExperience) return 0;
    const participants = form.watch('participants') || 1;
    const checkin = form.watch('checkinDate');
    const checkout = form.watch('checkoutDate');
    
    if (checkin && checkout) {
      const days = Math.ceil((new Date(checkout).getTime() - new Date(checkin).getTime()) / (1000 * 3600 * 24));
      return parseFloat(selectedExperience.price) * participants * Math.max(1, days);
    }
    
    return parseFloat(selectedExperience.price) * participants;
  };

  const nextStep = async () => {
    if (currentStep === 1 && !selectedExperience) {
      toast({
        title: "Selection Required",
        description: "Please select an experience to continue",
        variant: "destructive",
      });
      return;
    }

    if (currentStep === 2) {
      const isValid = await form.trigger(['checkinDate', 'checkoutDate', 'participants', 'firstName', 'lastName', 'email', 'phone']);
      if (!isValid) return;

      // Create booking
      const formData = form.getValues();
      const totalAmount = calculateTotal();
      
      try {
        const booking = await createBookingMutation.mutateAsync({
          ...formData,
          totalAmount: totalAmount.toString(),
        });
        
        // Create payment intent
        await createPaymentIntentMutation.mutateAsync({
          amount: totalAmount,
          bookingId: booking.id,
        });
      } catch (error: any) {
        toast({
          title: "Booking Error",
          description: error.message || "Failed to create booking",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePaymentSuccess = () => {
    setCurrentStep(4);
    // Fetch the confirmed booking details
    if (bookingId) {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings', bookingId] });
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Set minimum dates
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const checkinInput = document.querySelector('[name="checkinDate"]') as HTMLInputElement;
    const checkoutInput = document.querySelector('[name="checkoutDate"]') as HTMLInputElement;
    
    if (checkinInput) checkinInput.min = today;
    if (checkoutInput) checkoutInput.min = today;
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 -mx-4 px-4 py-4 mb-8">
        <div className="flex items-center space-x-2">
          <Mountain className="text-primary text-2xl" />
          <h1 className="text-xl font-serif font-semibold text-primary">Sikkim Monasteries</h1>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
        <a href="#" className="hover:text-foreground transition-colors">Home</a>
        <ChevronRight className="w-3 h-3" />
        <a href="#" className="hover:text-foreground transition-colors">Experiences</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Book Experience</span>
      </nav>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
          Book Your Spiritual Journey
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Embark on a transformative experience in the serene monasteries of Sikkim
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step, index) => (
            <div key={step} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step < currentStep ? 'step-completed' : 
                  step === currentStep ? 'step-active' : 'step-pending'
                }`}
                data-testid={`step-indicator-${step}`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:block">
                {step === 1 && 'Experience'}
                {step === 2 && 'Details'}
                {step === 3 && 'Payment'}
                {step === 4 && 'Confirmation'}
              </span>
              {index < 3 && <div className="w-8 h-0.5 bg-border ml-4"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Form Container */}
      <Card className="shadow-sm overflow-hidden">
        {/* Step 1: Experience Selection */}
        {currentStep === 1 && (
          <div className="fade-in" data-testid="step-1">
            <CardContent className="p-6">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-2">Choose Your Experience</h2>
                <p className="text-muted-foreground">Select the spiritual journey that calls to your soul</p>
              </div>
              
              {experiencesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted rounded-lg h-48 mb-4"></div>
                      <div className="space-y-2">
                        <div className="bg-muted rounded h-4 w-3/4"></div>
                        <div className="bg-muted rounded h-3 w-full"></div>
                        <div className="bg-muted rounded h-3 w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {experiences.map((experience) => (
                    <ExperienceCard
                      key={experience.id}
                      experience={experience}
                      isSelected={selectedExperience?.id === experience.id}
                      onSelect={handleExperienceSelect}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        )}

        {/* Step 2: Booking Details */}
        {currentStep === 2 && (
          <div className="fade-in" data-testid="step-2">
            <CardContent className="p-6">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-2">Booking Details</h2>
                <p className="text-muted-foreground">Choose your dates and provide guest information</p>
              </div>

              {selectedExperience && (
                <div className="bg-muted rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-4">
                    <Check className="text-primary text-xl" />
                    <div>
                      <h4 className="font-medium text-foreground">{selectedExperience.name}</h4>
                      <p className="text-sm text-muted-foreground">From ${selectedExperience.price}/person</p>
                    </div>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form className="space-y-6">
                  {/* Date Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="checkinDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-in Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-checkin-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="checkoutDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-out Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-checkout-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Participants */}
                  <FormField
                    control={form.control}
                    name="participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Participants</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-participants">
                              <SelectValue placeholder="Select participants" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Person</SelectItem>
                            <SelectItem value="2">2 People</SelectItem>
                            <SelectItem value="3">3 People</SelectItem>
                            <SelectItem value="4">4 People</SelectItem>
                            <SelectItem value="5">5+ People</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Guest Information */}
                  <div className="border-t border-border pt-6">
                    <h3 className="font-medium text-foreground mb-4">Primary Guest Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                data-testid="input-first-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                {...field} 
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                {...field} 
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Special Requests */}
                  <FormField
                    control={form.control}
                    name="specialRequests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests or Dietary Requirements</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3}
                            placeholder="Please let us know about any dietary restrictions, accessibility needs, or special requests..."
                            data-testid="textarea-special-requests"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Total Display */}
                  {selectedExperience && form.watch('participants') && (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">Estimated Total:</span>
                        <span className="text-primary text-xl font-bold" data-testid="text-total-amount">
                          ${calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <div className="fade-in" data-testid="step-3">
            <CardContent className="p-6">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-2">Payment Information</h2>
                <p className="text-muted-foreground">Secure payment processing</p>
              </div>

              {/* Booking Summary */}
              <div className="bg-muted rounded-lg p-4 mb-6">
                <h3 className="font-medium text-foreground mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience:</span>
                    <span className="text-foreground font-medium">{selectedExperience?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dates:</span>
                    <span className="text-foreground">
                      {form.watch('checkinDate')} to {form.watch('checkoutDate')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Participants:</span>
                    <span className="text-foreground">{form.watch('participants')} People</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-3">
                    <div className="flex justify-between font-medium">
                      <span className="text-foreground">Total Amount:</span>
                      <span className="text-primary text-lg">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <PaymentForm
                bookingId={bookingId}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            </CardContent>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="fade-in" data-testid="step-4">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-primary-foreground text-2xl" />
              </div>
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground mb-6">Thank you for choosing Sikkim Monasteries for your spiritual journey</p>
              
              {/* Confirmation Details */}
              <div className="bg-muted rounded-lg p-6 text-left max-w-md mx-auto">
                <h3 className="font-medium text-foreground mb-4 text-center">Booking Reference</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference Number:</span>
                    <span className="text-foreground font-mono" data-testid="text-reference-number">
                      #{confirmedBooking?.referenceNumber || 'SM-2024-001234'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience:</span>
                    <span className="text-foreground">{selectedExperience?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dates:</span>
                    <span className="text-foreground">
                      {form.watch('checkinDate')} to {form.watch('checkoutDate')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guests:</span>
                    <span className="text-foreground">
                      {form.watch('firstName')} {form.watch('lastName')} ({form.watch('participants')} people)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="text-primary font-medium">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <p className="text-sm text-muted-foreground">A confirmation email has been sent to your email address</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button className="bg-primary hover:bg-primary/90" data-testid="button-download-confirmation">
                    <Download className="w-4 h-4 mr-2" />
                    Download Confirmation
                  </Button>
                  <Button variant="outline" data-testid="button-add-calendar">
                    <Calendar className="w-4 h-4 mr-2" />
                    Add to Calendar
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="border-t border-border p-6">
            <div className="flex justify-between">
              <Button 
                variant="outline"
                onClick={previousStep}
                disabled={currentStep === 1}
                data-testid="button-previous"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <Button 
                onClick={nextStep}
                disabled={createBookingMutation.isPending || createPaymentIntentMutation.isPending}
                data-testid="button-next"
              >
                {createBookingMutation.isPending || createPaymentIntentMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    {currentStep === 3 ? "Complete Payment" : "Next"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
