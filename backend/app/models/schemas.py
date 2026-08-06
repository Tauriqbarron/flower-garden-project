from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


# ── Notification schemas ────────────────────────────────────────────────────

class Notification(BaseModel):
    id: str
    user_id: str
    type: str  # request_received | entry_published | already_exists | request_rejected | image_pending
    title: str
    body: str
    link: Optional[str] = None
    read: bool = False
    created_at: str


# ── Calendar Entry schemas ───────────────────────────────────────────────────

class CalendarEntryCreate(BaseModel):
    plant_type: str  # "flower" | "vegetable" | "native"
    plant_slug: str
    plant_name: str
    action: str  # "sow" | "transplant" | "harvest" | "flower" | "fruit"
    month: int    # 1-12
    year: int
    notes: Optional[str] = None


class CalendarEntry(BaseModel):
    id: str
    user_id: str
    plant_type: str
    plant_slug: str
    plant_name: str
    action: str
    month: int
    year: int
    notes: Optional[str] = None
    created_at: str


# ── Existing schemas ─────────────────────────────────────────────────────────

class GrowthStages(BaseModel):
    harvest: Optional[str] = None      # FIRST — most recognizable
    seedling: Optional[str] = None
    young_plant: Optional[str] = None


class RegionData(BaseModel):
    sow_start: Optional[int]
    sow_end: Optional[int]
    transplant_start: Optional[int]
    transplant_end: Optional[int]
    varieties: str


class FlowerActivity(BaseModel):
    id: str
    flower_name: str
    activity_type: str  # sow, transplant, feed, water, harvest, prune, pest_treatment
    date: str
    notes: Optional[str] = None
    created_at: str


class Flower(BaseModel):
    common_name: str
    slug: str
    botanical_name: Optional[str] = None
    family: Optional[str] = None
    description: Optional[str] = None
    flower_colours: List[str] = []
    type: str  # annual, perennial, biennial, corm
    sow_indoors: Optional[str] = None
    sow_outdoor: Optional[str] = None
    planting_depth: Optional[str] = None
    spacing: Optional[str] = None
    height: Optional[str] = None
    width: Optional[str] = None
    harvest: Optional[str] = None
    flowering_months: List[int] = []
    status: Optional[str] = None
    image_url: Optional[str] = None
    regions: dict
    flower_colour: Optional[List[str]] = None
    growth_rate: Optional[str] = None
    sun: Optional[str] = None
    water: Optional[str] = None
    soil: Optional[str] = None
    feed: Optional[str] = None
    petal_count: Optional[str] = None
    stem_length: Optional[str] = None
    vase_life: Optional[str] = None
    picking: Optional[str] = None
    fragrance: Optional[str] = None
    frost_tolerance: Optional[str] = None
    drought_tolerance: Optional[str] = None

    class Config:
        extra = "allow"


class SeasonMonth(BaseModel):
    month_number: int
    name: str
    nz_season: str
    tasks: List[str]
    sow_now: List[str]
    transplant_now: List[str]
    harvest_now: List[str]


class Vegetable(BaseModel):
    common_name: str
    slug: str
    vegetable_type: str  # root, leafy, fruit, allium, legume, brassica
    category: str  # staple, green
    sow_indoors: Optional[str] = None
    sow_outdoor: Optional[str] = None
    harvest: Optional[str] = None
    spacing_cm: Optional[int] = None
    height_cm: Optional[int] = None
    days_to_maturity_sow: Optional[int] = None
    days_to_maturity_transplant: Optional[int] = None
    frost_hardy: Optional[bool] = None
    hybrid: Optional[bool] = None
    organic: Optional[bool] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    storage: Optional[str] = None
    pest_resistance: Optional[str] = None
    notable_preference: Optional[str] = None
    avoid: Optional[str] = None
    harvest_start: Optional[int] = None
    harvest_end: Optional[int] = None
    harvest_months: Optional[List[int]] = None
    regions: dict

    class Config:
        extra = "allow"


class VegetableActivity(BaseModel):
    id: str
    vegetable_name: str
    activity_type: str  # sow, transplant, feed, water, harvest, cure, store
    date: str
    notes: Optional[str] = None
    created_at: str


class VegetableMonth(BaseModel):
    month_number: int
    name: str
    nz_season: str
    tasks: List[str]
    sow_now: List[str]
    transplant_now: List[str]
    harvest_now: List[str]


class Native(BaseModel):
    common_name: str
    slug: str
    botanical_name: Optional[str] = None
    family: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    life_cycle: str  # tree, shrub, groundcover, climber, fern
    is_deciduous: bool
    sun: str
    soil_ph: str
    soil_type: str
    max_height_m: float
    max_spread_m: float
    growth_rate: str  # slow, slow_moderate, moderate, fast
    life_expectancy_years: int
    propagation_method: str  # seed, cutting, division
    sow_depth_cm: Optional[float] = None
    germination_days: Optional[str] = None
    time_to_maturity_years: int
    flowering_months: List[int] = []
    fruiting_months: List[int] = []
    birds_attracted: List[str] = []
    growth_stages: Optional[GrowthStages] = None
    regions: dict

    class Config:
        extra = "allow"
