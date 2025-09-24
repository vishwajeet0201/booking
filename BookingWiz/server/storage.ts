import { type User, type InsertUser, type Experience, type InsertExperience, type Booking, type InsertBooking } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllExperiences(): Promise<Experience[]>;
  getExperience(id: string): Promise<Experience | undefined>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByReference(referenceNumber: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingPaymentStatus(id: string, status: string, paymentIntentId?: string): Promise<Booking | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private experiences: Map<string, Experience>;
  private bookings: Map<string, Booking>;

  constructor() {
    this.users = new Map();
    this.experiences = new Map();
    this.bookings = new Map();
    
    // Initialize with default experiences
    this.initializeExperiences();
  }

  private initializeExperiences() {
    const defaultExperiences: Experience[] = [
      {
        id: "meditation-retreats",
        name: "Meditation Retreats",
        description: "Join guided meditation sessions with Buddhist monks in serene monastery settings.",
        price: "120.00",
        duration: "3-7 days",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300",
        type: "meditation-retreats"
      },
      {
        id: "monastery-treks",
        name: "Monastery Treks",
        description: "Embark on scenic treks to remote monasteries through pristine Himalayan landscapes.",
        price: "200.00",
        duration: "5-10 days",
        image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300",
        type: "monastery-treks"
      },
      {
        id: "cultural-workshops",
        name: "Cultural Workshops",
        description: "Learn traditional Buddhist arts, crafts, and philosophy from local masters.",
        price: "80.00",
        duration: "2-5 days",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300",
        type: "cultural-workshops"
      },
      {
        id: "sunrise-tours",
        name: "Sunrise Tours",
        description: "Witness breathtaking sunrises over the Himalayas from monastery viewpoints.",
        price: "60.00",
        duration: "1-2 days",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300",
        type: "sunrise-tours"
      }
    ];

    defaultExperiences.forEach(exp => {
      this.experiences.set(exp.id, exp);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllExperiences(): Promise<Experience[]> {
    return Array.from(this.experiences.values());
  }

  async getExperience(id: string): Promise<Experience | undefined> {
    return this.experiences.get(id);
  }

  async createExperience(insertExperience: InsertExperience): Promise<Experience> {
    const id = randomUUID();
    const experience: Experience = { ...insertExperience, id };
    this.experiences.set(id, experience);
    return experience;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingByReference(referenceNumber: string): Promise<Booking | undefined> {
    return Array.from(this.bookings.values()).find(
      (booking) => booking.referenceNumber === referenceNumber,
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const referenceNumber = `SM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
    const booking: Booking = { 
      ...insertBooking, 
      id, 
      referenceNumber,
      paymentStatus: "pending",
      stripePaymentIntentId: null,
      specialRequests: insertBooking.specialRequests || null,
      createdAt: new Date()
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingPaymentStatus(id: string, status: string, paymentIntentId?: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking: Booking = {
      ...booking,
      paymentStatus: status,
      stripePaymentIntentId: paymentIntentId || booking.stripePaymentIntentId
    };
    
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
}

export const storage = new MemStorage();
