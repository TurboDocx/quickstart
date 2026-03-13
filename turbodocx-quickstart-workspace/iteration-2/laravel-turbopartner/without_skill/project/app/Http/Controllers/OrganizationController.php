<?php

namespace App\Http\Controllers;

use App\Services\TurboPartnerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function __construct(
        private TurboPartnerService $turboPartner
    ) {}

    /**
     * GET /api/organizations
     *
     * List all customer organizations under this partner account.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $organizations = $this->turboPartner->listOrganizations(
                $request->only(['page', 'limit', 'search'])
            );

            return response()->json($organizations);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to list organizations',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/organizations
     *
     * Create a new customer organization.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:100',
            'admin_email' => 'required|email',
            'plan' => 'nullable|string',
        ]);

        try {
            $organization = $this->turboPartner->createOrganization($validated);

            return response()->json($organization, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create organization',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/organizations/{id}
     *
     * Get a single organization by ID.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $organization = $this->turboPartner->getOrganization($id);

            return response()->json($organization);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to retrieve organization',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/organizations/{id}
     *
     * Update an existing organization.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100',
            'plan' => 'sometimes|string',
            'status' => 'sometimes|string|in:active,suspended,cancelled',
        ]);

        try {
            $organization = $this->turboPartner->updateOrganization($id, $validated);

            return response()->json($organization);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update organization',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/organizations/{id}
     *
     * Delete (deactivate) an organization.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $result = $this->turboPartner->deleteOrganization($id);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete organization',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/organizations/{id}/members
     *
     * List members of an organization.
     */
    public function members(Request $request, string $id): JsonResponse
    {
        try {
            $members = $this->turboPartner->listOrganizationMembers(
                $id,
                $request->only(['page', 'limit'])
            );

            return response()->json($members);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to list organization members',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/organizations/{id}/members
     *
     * Add a member to an organization.
     */
    public function addMember(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'role' => 'nullable|string|in:admin,member,viewer',
        ]);

        try {
            $member = $this->turboPartner->addOrganizationMember($id, $validated);

            return response()->json($member, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to add member to organization',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/organizations/{id}/members/{memberId}
     *
     * Remove a member from an organization.
     */
    public function removeMember(string $id, string $memberId): JsonResponse
    {
        try {
            $result = $this->turboPartner->removeOrganizationMember($id, $memberId);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to remove member from organization',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
