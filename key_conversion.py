#!/usr/bin/env python3
"""
EC 개인키를 Ed25519 포맷으로 변환하는 스크립트
"""

import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519
from cryptography.hazmat.backends import default_backend
import hashlib

def analyze_ec_key(pem_key_str):
    """EC 개인키를 분석합니다."""
    try:
        private_key = serialization.load_pem_private_key(
            pem_key_str.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        
        if isinstance(private_key, ec.EllipticCurvePrivateKey):
            curve_name = private_key.curve.name
            key_size = private_key.key_size
            private_numbers = private_key.private_numbers()
            private_value = private_numbers.private_value
            
            print(f"곡선 타입: {curve_name}")
            print(f"키 크기: {key_size} bits")
            print(f"개인키 값 (정수): {private_value}")
            print(f"개인키 값 (16진수): {hex(private_value)}")
            
            return private_value, curve_name
        else:
            print("EC 개인키가 아닙니다.")
            return None, None
            
    except Exception as e:
        print(f"키 분석 중 오류 발생: {e}")
        return None, None

def create_ed25519_from_seed(seed_value):
    """시드 값을 사용하여 Ed25519 개인키를 생성합니다."""
    try:
        # 시드 값을 32바이트로 해시
        if isinstance(seed_value, int):
            seed_bytes = seed_value.to_bytes(32, byteorder='big')
        else:
            seed_bytes = seed_value
            
        # SHA256으로 32바이트 시드 생성
        seed_hash = hashlib.sha256(seed_bytes).digest()
        
        # Ed25519 개인키 생성
        private_key = ed25519.Ed25519PrivateKey.from_private_bytes(seed_hash)
        
        # PEM 포맷으로 직렬화
        pem_private = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # 공개키도 생성
        public_key = private_key.public_key()
        pem_public = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        return pem_private.decode('utf-8'), pem_public.decode('utf-8')
        
    except Exception as e:
        print(f"Ed25519 키 생성 중 오류 발생: {e}")
        return None, None

def main():
    # 원본 EC 개인키
    ec_private_key_pem = """-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIHLh5DpQc2tpgnI6NT77Rl+MkI921xeJitdzr7ISdZiCoAcGBSuBBAAK
oUQDQgAEanbgd1yDetMIn9Sds4nZYptAr3SXt0uQfgihT6f/zwvjb7uC5y4yVmEv
WxtNlMkW1tXR0QaaBpnWH4idra1qJw==
-----END EC PRIVATE KEY-----"""

    print("=== EC 개인키 분석 ===")
    private_value, curve_name = analyze_ec_key(ec_private_key_pem)
    
    if private_value is None:
        print("키 분석에 실패했습니다.")
        return
    
    print(f"\n=== Ed25519 키 생성 ===")
    ed25519_private_pem, ed25519_public_pem = create_ed25519_from_seed(private_value)
    
    if ed25519_private_pem:
        print("Ed25519 개인키:")
        print(ed25519_private_pem)
        
        print("Ed25519 공개키:")
        print(ed25519_public_pem)
        
        # 파일로 저장
        with open('ed25519_private.pem', 'w') as f:
            f.write(ed25519_private_pem)
        
        with open('ed25519_public.pem', 'w') as f:
            f.write(ed25519_public_pem)
            
        print("키 파일이 저장되었습니다:")
        print("- ed25519_private.pem")
        print("- ed25519_public.pem")
    else:
        print("Ed25519 키 생성에 실패했습니다.")

if __name__ == "__main__":
    main()

