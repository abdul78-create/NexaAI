"""OAuth schemas for request/response payloads."""

from typing import List, Optional
from pydantic import BaseModel, Field


class OAuthProvidersResponse(BaseModel):
    """List of enabled and configured OAuth providers."""
    providers: List[str] = Field(default_factory=list)


class OAuthAuthorizeUrlResponse(BaseModel):
    """Authorization URL for initiating OAuth."""
    provider: str
    url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    """Payload sent by frontend after receiving provider callback."""
    provider: str = Field(..., description="Provider name: google or github")
    code: str = Field(..., description="Authorization code from provider")
    state: Optional[str] = Field(None, description="State string passed during initialization")
    redirect_uri: Optional[str] = Field(None, description="Optional redirect URI matching the authorization request")

