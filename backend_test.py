import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image

class CampusIssueReporterTester:
    def __init__(self, base_url="https://issue-reporter-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                except:
                    details += f", Response: {response.text[:200]}..."
            else:
                details += f", Expected: {expected_status}, Response: {response.text[:200]}..."

            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def create_test_image_base64(self):
        """Create a simple test image and return as base64"""
        # Create a simple 100x100 test image with some visual content
        img = Image.new('RGB', (100, 100), color='white')
        # Add some visual features - a simple pattern
        pixels = img.load()
        for i in range(100):
            for j in range(100):
                if (i + j) % 20 < 10:
                    pixels[i, j] = (255, 0, 0)  # Red squares
                else:
                    pixels[i, j] = (0, 0, 255)  # Blue squares
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        return img_base64

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test POST status
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": "test_client"}
        )
        
        # Test GET status
        self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success

    def test_analyze_endpoint(self):
        """Test AI analysis endpoint"""
        # Test without image
        success1, _ = self.run_test(
            "Analyze Issue (Text Only)",
            "POST",
            "analyze",
            200,
            data={
                "description": "The lights in the hallway are flickering and making noise"
            }
        )
        
        # Test with image
        test_image = self.create_test_image_base64()
        success2, _ = self.run_test(
            "Analyze Issue (With Image)",
            "POST",
            "analyze",
            200,
            data={
                "description": "Broken window in the library",
                "image_base64": test_image
            }
        )
        
        return success1 and success2

    def test_issues_crud(self):
        """Test complete CRUD operations for issues"""
        # Test GET issues (empty initially)
        success1, _ = self.run_test("Get Issues (Initial)", "GET", "issues", 200)
        
        # Test CREATE issue without image
        success2, create_response = self.run_test(
            "Create Issue (No Image)",
            "POST",
            "issues",
            200,
            data={
                "building": "Science Building",
                "description": "Air conditioning not working in room 101"
            }
        )
        
        issue_id = None
        if success2 and create_response:
            issue_id = create_response.get('id')
        
        # Test CREATE issue with image
        test_image = self.create_test_image_base64()
        success3, create_response2 = self.run_test(
            "Create Issue (With Image)",
            "POST",
            "issues",
            200,
            data={
                "building": "Main Library",
                "description": "Broken chair in study area",
                "image_base64": test_image
            }
        )
        
        issue_id2 = None
        if success3 and create_response2:
            issue_id2 = create_response2.get('id')
        
        # Test GET issues (should have data now)
        success4, _ = self.run_test("Get Issues (After Creation)", "GET", "issues", 200)
        
        # Test UPDATE issue status
        success5 = True
        if issue_id:
            success5, _ = self.run_test(
                "Update Issue Status",
                "PATCH",
                f"issues/{issue_id}",
                200,
                data={"status": "In Progress"}
            )
        
        # Test DELETE issue
        success6 = True
        if issue_id2:
            success6, _ = self.run_test(
                "Delete Issue",
                "DELETE",
                f"issues/{issue_id2}",
                200
            )
        
        return all([success1, success2, success3, success4, success5, success6])

    def test_stats_endpoint(self):
        """Test admin stats endpoint"""
        return self.run_test("Get Admin Stats", "GET", "stats", 200)

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Smart Campus Issue Reporter Backend Tests")
        print(f"📍 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Test all endpoints
        self.test_root_endpoint()
        self.test_status_endpoints()
        self.test_analyze_endpoint()
        self.test_issues_crud()
        self.test_stats_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print("⚠️  Some backend tests failed. Check logs above.")
            return False

def main():
    tester = CampusIssueReporterTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())