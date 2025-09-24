import { Experience } from "@shared/schema";
import { Clock } from "lucide-react";

interface ExperienceCardProps {
  experience: Experience;
  isSelected: boolean;
  onSelect: (experience: Experience) => void;
}

export function ExperienceCard({ experience, isSelected, onSelect }: ExperienceCardProps) {
  return (
    <div 
      className={`experience-card bg-card border border-border rounded-lg overflow-hidden cursor-pointer ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(experience)}
      data-testid={`card-experience-${experience.type}`}
    >
      <img 
        src={experience.image} 
        alt={experience.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2" data-testid={`text-experience-name-${experience.type}`}>
          {experience.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-3" data-testid={`text-experience-description-${experience.type}`}>
          {experience.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-primary font-medium" data-testid={`text-experience-price-${experience.type}`}>
            From ${experience.price}/person
          </span>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            <span data-testid={`text-experience-duration-${experience.type}`}>
              {experience.duration}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
