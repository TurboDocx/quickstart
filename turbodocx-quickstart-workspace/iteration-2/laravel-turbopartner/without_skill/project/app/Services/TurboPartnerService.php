<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class TurboPartnerService
{
    private string $baseUrl;
    private string $apiKey;
    private string $partnerId;

    public function __construct()
    {
        $this->baseUrl = config('services.turbodocx.base_url');
        $this->apiKey = config('services.turbodocx.api_key');
        $this->partnerId = config('services.turbodocx.partner_id');
    }

    /**
     * Build an authenticated HTTP client for TurboDocx API calls.
     */
    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'X-Partner-Id' => $this->partnerId,
                'Accept' => 'application/json',
            ]);
    }

    /**
     * List all organizations under this partner account.
     *
     * @param array $query Optional query parameters (e.g. page, limit, search).
     * @return array
     * @throws RequestException
     */
    public function listOrganizations(array $query = []): array
    {
        $response = $this->client()
            ->get('/v1/partner/organizations', $query);

        $response->throw();

        return $response->json();
    }

    /**
     * Create a new customer organization.
     *
     * @param array $data Organization data (name, slug, admin_email, plan, etc.).
     * @return array The created organization.
     * @throws RequestException
     */
    public function createOrganization(array $data): array
    {
        $response = $this->client()
            ->post('/v1/partner/organizations', $data);

        $response->throw();

        return $response->json();
    }

    /**
     * Get a single organization by ID.
     *
     * @param string $organizationId
     * @return array
     * @throws RequestException
     */
    public function getOrganization(string $organizationId): array
    {
        $response = $this->client()
            ->get("/v1/partner/organizations/{$organizationId}");

        $response->throw();

        return $response->json();
    }

    /**
     * Update an existing organization.
     *
     * @param string $organizationId
     * @param array  $data Fields to update (name, plan, status, etc.).
     * @return array The updated organization.
     * @throws RequestException
     */
    public function updateOrganization(string $organizationId, array $data): array
    {
        $response = $this->client()
            ->patch("/v1/partner/organizations/{$organizationId}", $data);

        $response->throw();

        return $response->json();
    }

    /**
     * Delete (deactivate) an organization.
     *
     * @param string $organizationId
     * @return array
     * @throws RequestException
     */
    public function deleteOrganization(string $organizationId): array
    {
        $response = $this->client()
            ->delete("/v1/partner/organizations/{$organizationId}");

        $response->throw();

        return $response->json();
    }

    /**
     * List members/users within an organization.
     *
     * @param string $organizationId
     * @param array  $query Optional query parameters.
     * @return array
     * @throws RequestException
     */
    public function listOrganizationMembers(string $organizationId, array $query = []): array
    {
        $response = $this->client()
            ->get("/v1/partner/organizations/{$organizationId}/members", $query);

        $response->throw();

        return $response->json();
    }

    /**
     * Add a member to an organization.
     *
     * @param string $organizationId
     * @param array  $data Member data (email, role, etc.).
     * @return array
     * @throws RequestException
     */
    public function addOrganizationMember(string $organizationId, array $data): array
    {
        $response = $this->client()
            ->post("/v1/partner/organizations/{$organizationId}/members", $data);

        $response->throw();

        return $response->json();
    }

    /**
     * Remove a member from an organization.
     *
     * @param string $organizationId
     * @param string $memberId
     * @return array
     * @throws RequestException
     */
    public function removeOrganizationMember(string $organizationId, string $memberId): array
    {
        $response = $this->client()
            ->delete("/v1/partner/organizations/{$organizationId}/members/{$memberId}");

        $response->throw();

        return $response->json();
    }
}
