#include <iostream>
#include <vector>
#include <string>

template<typename T>
std::string toJson(const T& val);

template<typename T>
std::string toJson(const std::vector<T>& vec) {
    std::string res = "[";
    for(size_t i = 0; i < vec.size(); ++i) {
        res += toJson(vec[i]);
        if (i < vec.size() - 1) res += ", ";
    }
    res += "]";
    return res;
}

std::string toJson(const int& val) { return std::to_string(val); }
std::string toJson(const std::string& val) { return "\\"" + val + "\\""; }

int main() {
    std::vector<int> v1 = {1, 2, 3};
    std::vector<std::vector<int>> v2 = {{1, 3}, {2, 1}};
    std::cout << toJson(v1) << std::endl;
    std::cout << toJson(v2) << std::endl;
    std::cout << toJson(42) << std::endl;
    std::cout << toJson(std::string("hello")) << std::endl;
    return 0;
}
