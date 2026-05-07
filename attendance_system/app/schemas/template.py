from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional, Any

class TemplateBase(BaseModel):
    name: str
    background_image: Optional[str] = None
    elements_config: Dict[str, Any]
    is_active: bool = True

class TemplateCreate(TemplateBase):
    event_id: int

class TemplateOut(TemplateBase):
    id: int
    event_id: int

    model_config = ConfigDict(from_attributes=True)
