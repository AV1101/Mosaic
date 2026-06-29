export type SectionCategory = string;

export type SectionItem = {
  id: string;
  name: string;
  category: SectionCategory;
  description: string;
  tags: string[];
  previewImage: string;
  promptTemplate: string;
  figmaFrameUrl: string;
  brandName: string;
  createdAt: string;
  textOnly: number;
  iconOnly: number;
  iconText: number;
  imageField: number;
  fieldLabels: {
    text_fields?: string[];
    icon_slots?: string[];
    image_fields?: string[];
    icon_text_slots?: string[];
  };
};

export type PromptRegistryItem = {
  id: string;
  name: string;
  category: SectionCategory;
  lastUpdated: string;
  tokensUsed: number;
};
