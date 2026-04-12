import requests
import sys
from datetime import datetime
import json

class BusTrackerAPITester:
    def __init__(self, base_url="https://bus-locator-25.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, expected_fields=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, headers=headers, timeout=15)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            if success:
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    
                    # Check expected fields if provided
                    if expected_fields:
                        for field in expected_fields:
                            if field not in response_data:
                                success = False
                                print(f"   ❌ Missing expected field: {field}")
                            else:
                                print(f"   ✅ Found expected field: {field}")
                                
                except Exception as e:
                    print(f"   ⚠️  Could not parse JSON response: {e}")
                    response_data = {"raw_response": response.text[:200]}
                    
                if success:
                    self.tests_passed += 1
                    print(f"✅ {name} - PASSED")
                else:
                    print(f"❌ {name} - FAILED")
            else:
                print(f"❌ {name} - FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    response_data = response.json()
                except:
                    response_data = {"error": response.text[:200]}

            self.test_results.append({
                "name": name,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "response_data": response_data
            })

            return success, response_data

        except requests.exceptions.Timeout:
            print(f"❌ {name} - FAILED - Request timeout")
            self.test_results.append({
                "name": name,
                "success": False,
                "error": "timeout"
            })
            return False, {}
        except Exception as e:
            print(f"❌ {name} - FAILED - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200,
            expected_fields=["message"]
        )

    def test_buses_endpoint(self):
        """Test the buses endpoint with ghost bus features"""
        success, response = self.run_test(
            "Buses Endpoint",
            "GET",
            "api/buses",
            200,
            expected_fields=["buses", "count", "activeCount", "lastSeenCount"]
        )
        
        if success and response:
            buses = response.get("buses", [])
            count = response.get("count", 0)
            active_count = response.get("activeCount", 0)
            last_seen_count = response.get("lastSeenCount", 0)
            
            print(f"   📊 Found {count} total buses ({active_count} active, {last_seen_count} last seen)")
            
            # Verify count consistency
            if count == active_count + last_seen_count:
                print(f"   ✅ Count consistency check passed")
            else:
                print(f"   ❌ Count mismatch: total={count}, active={active_count}, lastSeen={last_seen_count}")
            
            if buses:
                # Check first bus structure
                first_bus = buses[0]
                expected_bus_fields = ["id", "lat", "lon", "busNumber", "line", "color", "heading", "isLastSeen"]
                
                print(f"   🚌 Checking first bus structure:")
                for field in expected_bus_fields:
                    if field in first_bus:
                        print(f"      ✅ {field}: {first_bus[field]}")
                    else:
                        print(f"      ❌ Missing field: {field}")
                
                # Check for ghost bus features
                active_buses = [b for b in buses if not b.get("isLastSeen", False)]
                ghost_buses = [b for b in buses if b.get("isLastSeen", False)]
                
                print(f"   👻 Ghost bus analysis:")
                print(f"      Active buses: {len(active_buses)}")
                print(f"      Ghost buses: {len(ghost_buses)}")
                
                # Check ghost bus fields
                if ghost_buses:
                    ghost_bus = ghost_buses[0]
                    if "lastSeenAt" in ghost_bus:
                        print(f"      ✅ Ghost bus has lastSeenAt: {ghost_bus['lastSeenAt']}")
                    else:
                        print(f"      ❌ Ghost bus missing lastSeenAt field")
                        
                # Validate coordinates
                if "lat" in first_bus and "lon" in first_bus:
                    lat, lon = first_bus["lat"], first_bus["lon"]
                    # Rivera, Uruguay coordinates should be around -30.9, -55.5
                    if -32 < lat < -29 and -57 < lon < -54:
                        print(f"      ✅ Coordinates look valid for Rivera: {lat}, {lon}")
                    else:
                        print(f"      ⚠️  Coordinates seem unusual for Rivera: {lat}, {lon}")
            else:
                print(f"   ⚠️  No buses found in response")
                
        return success, response

    def test_lines_endpoint(self):
        """Test the lines endpoint"""
        success, response = self.run_test(
            "Lines Endpoint",
            "GET",
            "api/lines",
            200,
            expected_fields=["lines"]
        )
        
        if success and response:
            lines = response.get("lines", [])
            print(f"   📊 Found {len(lines)} lines")
            
            if lines:
                # Check first line structure
                first_line = lines[0]
                expected_line_fields = ["id", "name", "color"]
                
                print(f"   🚌 Checking first line structure:")
                for field in expected_line_fields:
                    if field in first_line:
                        print(f"      ✅ {field}: {first_line[field]}")
                    else:
                        print(f"      ❌ Missing field: {field}")
                        
                # Check if colors are valid hex codes
                for line in lines[:3]:  # Check first 3 lines
                    color = line.get("color", "")
                    if color.startswith("#") and len(color) == 7:
                        print(f"      ✅ Line {line.get('id')} has valid color: {color}")
                    else:
                        print(f"      ⚠️  Line {line.get('id')} has invalid color: {color}")
            else:
                print(f"   ⚠️  No lines found in response")
                
        return success, response

    def test_ghost_bus_functionality(self):
        """Test ghost bus functionality by inserting a test document"""
        print(f"\n🔍 Testing Ghost Bus Functionality...")
        
        try:
            # First, let's try to insert a test ghost bus into MongoDB
            # This simulates a bus that was seen before but is no longer in the API
            import pymongo
            from datetime import datetime, timezone, timedelta
            
            # Connect to MongoDB
            mongo_client = pymongo.MongoClient("mongodb://localhost:27017")
            db = mongo_client["test_database"]
            
            # Insert a test ghost bus that should appear in the API response
            test_ghost_bus = {
                "busId": "GHOST_TEST_001",
                "busNumber": "999",
                "licensePlate": "TEST-999",
                "line": "99",
                "routeName": "Ruta de Prueba",
                "departureTime": "12:00",
                "currentStop": "Parada Test",
                "heading": 180,
                "icon": "bus",
                "accessible": False,
                "color": "#FF0000",
                "lat": -30.9053,
                "lon": -55.5508,
                "lastSeenAt": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
                "status": "active",
            }
            
            # Insert the test document
            result = db.bus_positions.update_one(
                {"busId": "GHOST_TEST_001"},
                {"$set": test_ghost_bus},
                upsert=True
            )
            
            print(f"   ✅ Inserted test ghost bus into MongoDB")
            
            # Now test the API to see if it returns the ghost bus
            success, response = self.run_test(
                "Ghost Bus API Response",
                "GET",
                "api/buses",
                200,
                expected_fields=["buses", "activeCount", "lastSeenCount"]
            )
            
            if success and response:
                buses = response.get("buses", [])
                last_seen_count = response.get("lastSeenCount", 0)
                
                # Look for our test ghost bus
                ghost_bus_found = False
                for bus in buses:
                    if bus.get("id") == "GHOST_TEST_001" and bus.get("isLastSeen") == True:
                        ghost_bus_found = True
                        print(f"   ✅ Found test ghost bus in API response")
                        print(f"      Bus ID: {bus.get('id')}")
                        print(f"      isLastSeen: {bus.get('isLastSeen')}")
                        print(f"      lastSeenAt: {bus.get('lastSeenAt')}")
                        break
                
                if not ghost_bus_found:
                    print(f"   ❌ Test ghost bus not found in API response")
                    print(f"   Available bus IDs: {[b.get('id') for b in buses]}")
                
                if last_seen_count > 0:
                    print(f"   ✅ API reports {last_seen_count} last seen buses")
                else:
                    print(f"   ⚠️  API reports 0 last seen buses")
            
            # Clean up - remove the test document
            db.bus_positions.delete_one({"busId": "GHOST_TEST_001"})
            print(f"   ✅ Cleaned up test ghost bus from MongoDB")
            
            mongo_client.close()
            
            return success, response
            
        except ImportError:
            print(f"   ⚠️  pymongo not available, skipping MongoDB ghost bus test")
            return True, {}
        except Exception as e:
            print(f"   ❌ Error testing ghost bus functionality: {e}")
            return False, {}

def main():
    print("🚌 MICRO Rivera Bus Tracker API Testing")
    print("=" * 50)
    
    # Setup
    tester = BusTrackerAPITester()
    
    # Run tests
    print("\n📡 Testing API endpoints...")
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test buses endpoint
    tester.test_buses_endpoint()
    
    # Test lines endpoint  
    tester.test_lines_endpoint()
    
    # Test ghost bus functionality
    tester.test_ghost_bus_functionality()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print failed tests
    failed_tests = [t for t in tester.test_results if not t["success"]]
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test['name']}: {test.get('error', 'Status code mismatch')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())