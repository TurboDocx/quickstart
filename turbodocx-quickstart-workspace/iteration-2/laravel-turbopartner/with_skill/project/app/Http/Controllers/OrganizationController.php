<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use TurboDocx\TurboPartner;
use TurboDocx\Types\Requests\Partner\CreateOrganizationRequest;
use TurboDocx\TurboDocxError;
use TurboDocx\Errors\AuthenticationError;
use TurboDocx\Errors\ValidationError;

class OrganizationController extends Controller
{
    /**
     * Provision a new customer organization via TurboPartner.
     */
    public function create(Request $request): JsonResponse
    {
        try {
            // Validate incoming request data
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'features' => 'sometimes|array',
            ]);

            // Create the organization through TurboPartner SDK
            $result = TurboPartner::createOrganization(
                new CreateOrganizationRequest(
                    name: $validated['name'],
                    features: $validated['features'] ?? [],
                )
            );

            return response()->json($result, 201);
        } catch (ValidationError $e) {
            // Bad request — invalid or missing fields
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (AuthenticationError $e) {
            // Invalid or missing partner API key
            return response()->json(['error' => $e->getMessage()], 401);
        } catch (TurboDocxError $e) {
            // Catch-all for any other SDK error
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode() ?: 500);
        }
    }

    /**
     * List all managed customer organizations.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Support optional pagination query parameters
            $page = (int) $request->query('page', 1);
            $limit = (int) $request->query('limit', 20);

            // Fetch organizations from TurboPartner SDK
            $orgs = TurboPartner::listOrganizations(page: $page, limit: $limit);

            return response()->json($orgs);
        } catch (AuthenticationError $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        } catch (TurboDocxError $e) {
            return response()->json(['error' => $e->getMessage()], $e->getStatusCode() ?: 500);
        }
    }
}
