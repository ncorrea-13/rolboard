package handlers

import "github.com/ncorrea-13/rolboard/server/internal/service"

type Handlers struct {
	campaigns *service.CampaignService
	arcs      *service.ArcService
}

func NewHandlers(campaigns *service.CampaignService, arcs *service.ArcService) *Handlers {
	return &Handlers{campaigns: campaigns, arcs: arcs}
}
