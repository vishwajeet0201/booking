import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all experiences
  app.get("/api/experiences", async (req, res) => {
    try {
      const experiences = await storage.getAllExperiences();
      res.json(experiences);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching experiences: " + error.message });
    }
  });

  // Get specific experience
  app.get("/api/experiences/:id", async (req, res) => {
    try {
      const experience = await storage.getExperience(req.params.id);
      if (!experience) {
        return res.status(404).json({ message: "Experience not found" });
      }
      res.json(experience);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching experience: " + error.message });
    }
  });

  // Create booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(validatedData);
      res.status(201).json(booking);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating booking: " + error.message });
    }
  });

  // Get booking by reference
  app.get("/api/bookings/:reference", async (req, res) => {
    try {
      const booking = await storage.getBookingByReference(req.params.reference);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching booking: " + error.message });
    }
  });

  // Create mock payment intent (UI only)
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, bookingId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      // Generate mock payment intent ID
      const mockPaymentIntentId = `pi_mock_${Date.now()}`;

      // Update booking with mock payment intent ID if bookingId provided
      if (bookingId) {
        await storage.updateBookingPaymentStatus(bookingId, "processing", mockPaymentIntentId);
      }

      res.json({ 
        clientSecret: `pi_mock_${Date.now()}_secret_mock`,
        paymentIntentId: mockPaymentIntentId
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Mock payment confirmation (UI only)
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId, bookingId } = req.body;
      
      if (!paymentIntentId || !bookingId) {
        return res.status(400).json({ message: "Payment intent ID and booking ID are required" });
      }

      // Mock payment success (simulate successful payment)
      const updatedBooking = await storage.updateBookingPaymentStatus(bookingId, "completed", paymentIntentId);
      res.json({ 
        success: true, 
        booking: updatedBooking,
        paymentStatus: "succeeded" 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error confirming payment: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
