from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FlowerActivity(BaseModel):
    id: str
    flower_name: str
    activity_type: str  # sow, transplant, feed, water, harvest, prune, pest_treatment
    date: str
    notes: Optional[str] = None
    created_at: str


class Flower(BaseModel):
    common_name: str
    botanical_name: str
    family: str
    type: str
    sun: str
    soil_ph: str
    soil_type: str
    spacing_cm: int
    row_spacing_cm: int
    sow_depth_cm: Optional[float]
    germination_temp_c: Optional[str]
    germination_days: Optional[str]
    days_to_maturity_sow: Optional[int]
    days_to_maturity_transplant: Optional[int]
    auckland_sow_start: Optional[int]
    auckland_sow_end: Optional[int]
    auckland_transplant_start: Optional[int]
    auckland_transplant_end: Optional[int]
    flowering_start: Optional[int]
    flowering_end: Optional[int]
    vase_life_days: str
    stem_length_cm: str
    pinching: bool
    staking: bool
    deadheading: bool
    cut_flower_notes: str
    auckland_varieties: str
    pest_disease_notes: str


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
    botanical_name: str
    family: str
    type: str
    category: str  # "staple" or "green"
    sun: str
    soil_ph: str
    soil_type: str
    spacing_cm: int
    row_spacing_cm: int
    sow_depth_cm: Optional[float]
    germination_temp_c: Optional[str]
    germination_days: Optional[str]
    days_to_maturity_sow: Optional[int]
    days_to_maturity_transplant: Optional[int]
    auckland_sow_start: Optional[int]
    auckland_sow_end: Optional[int]
    auckland_transplant_start: Optional[int]
    auckland_transplant_end: Optional[int]
    harvest_start: Optional[int]
    harvest_end: Optional[int]
    storage_life_weeks: Optional[str]
    storage_method: Optional[str]
    pest_resistance: Optional[str]
    disease_resistance: Optional[str]
    growing_notes: str
    auckland_varieties: str
    pest_disease_notes: str


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
