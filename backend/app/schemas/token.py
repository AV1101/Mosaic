from pydantic import BaseModel


class DesignTokenUpsert(BaseModel):
    component_id: int | None = None
    brand_profile: str = "Default"
    preset_name: str = "Enterprise"
    tokens: dict


class DesignTokenRead(DesignTokenUpsert):
    id: int

    model_config = {"from_attributes": True}
