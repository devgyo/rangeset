type Provenance = {
  unit?: string;
  method?: string;
  sourceUrl?: string;
  verifiedAt?: string;
};

export type Spec<T extends string | number | boolean> = Provenance &
  (
    | { value: T; source: "brand" | "third_party" | "manual" }
    | { value: null; source: "not_published" }
  );

export type Jacket = {
  slug: string;
  brand: string;
  model: string;
  example?: boolean;
  status?: "active" | "discontinued" | "pending_review";
  sourceUrl: string | null;
  verifiedAt: string | null;
  specs: {
    membrane?: Spec<string>;
    layers?: Spec<number>;
    faceDenier?: Spec<number>;
    weight?: Spec<number>;
    weightSize?: Spec<string>;
    backLength?: Spec<number>;
    waterproof?: Spec<number>;
    breathability?: Spec<number>;
    fit?: Spec<string>;
    price?: Spec<number>;
    pitZips?: Spec<boolean>;
    helmetHood?: Spec<boolean>;
  };
};
